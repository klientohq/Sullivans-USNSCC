/**
 * POST /api/contact - verify a Turnstile token for the contact form.
 *
 * WHAT THIS DOES TODAY, STATED PLAINLY (ADR-014, ADR-017)
 * ------------------------------------------------------
 * It verifies the challenge and nothing else. It does not send mail, and it
 * does not store the submission. The browser still opens a pre-filled mail
 * draft, exactly as the form's own copy says it will.
 *
 * That is not a shortcut, it is the only honest option available right now.
 * Every server-side delivery path costs money or needs the domain:
 *
 *   Cloudflare Email Routing   free, but needs the zone ACTIVE, which needs the
 *                              nameserver change the CO has not made yet
 *   Cloudflare Email Service   public beta, $0.35 per 1,000 messages, and paid
 *   MailChannels               free Workers tier ended 2024-08-31
 *   Resend / SES / Postmark    account + API key + a verified sending domain,
 *                              which again needs the zone
 *   SMTP from a Worker         impossible: V8 isolates cannot open raw TCP
 *
 * So the plumbing ships now and delivery switches on at cutover. The switch is
 * written down in brain/DECISIONS.md under ADR-017; it is one branch in this
 * file plus one line in main.js.
 *
 * Nothing here is stored or logged. The submission body is read only to check
 * that required fields are present, then discarded. That keeps the zero-PII
 * posture of ADR-006, which matters because the people filling this in are
 * families of minors.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });

export async function onRequestPost({ request, env }) {
  if (!env.TURNSTILE_SECRET) {
    // Fail closed. A missing secret must never read as a passed challenge.
    return json(500, { ok: false, error: 'verification_unavailable' });
  }

  // Bound the request before parsing it. Everything below this point is cheap,
  // but request.json() will buffer whatever arrives, and the challenge cannot
  // be checked first because the token is inside the body. A real submission is
  // well under 8 KB; the cap is generous and still refuses a bot posting bulk.
  // This is not rate limiting. A Cloudflare rate-limiting rule on /api/contact
  // needs an ACTIVE zone, and the zone is still pending the nameserver change,
  // so that rule is a cutover step (see BLOCKERS.md), not something forgotten.
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > 16384) return json(413, { ok: false, error: 'too_large' });

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16384) return json(413, { ok: false, error: 'too_large' });
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'bad_request' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, error: 'bad_request' });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return json(400, { ok: false, error: 'missing_token' });

  // The client validates these too. Re-checking here means a direct POST cannot
  // farm a verified token off an empty form.
  for (const field of ['firstName', 'email', 'subject', 'message']) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return json(400, { ok: false, error: 'missing_field', field });
    }
  }

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);
  // NO idempotency_key here, deliberately. It used to send crypto.randomUUID()
  // on every request under a comment claiming that let a retry of the same
  // token succeed instead of reading as a replay. It did no such thing: a fresh
  // random key each time is simply a new verification, so the call behaved
  // exactly as if the field were absent.
  //
  // The field exists so that ONE siteverify call can be retried after a network
  // failure using the SAME key and get the same answer back. We do not retry.
  //
  // Do not "fix" this by deriving the key from the token. Turnstile tokens are
  // single-use by design: a replayed token returns timeout-or-duplicate, and
  // that is the protection. A stable per-token key would cache the success and
  // let one solved challenge be redeemed over and over, which becomes a real
  // hole the moment the cutover below starts sending mail (ADR-017).

  let outcome;
  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body: form });
    outcome = await res.json();
  } catch {
    return json(502, { ok: false, error: 'verification_unreachable' });
  }

  if (!outcome.success) {
    return json(403, { ok: false, error: 'challenge_failed', codes: outcome['error-codes'] || [] });
  }

  // ---- CUTOVER POINT (ADR-017) -------------------------------------------
  // When thesullivansusnscc.com is live on Cloudflare and Email Routing is
  // enabled, send the message here and return { ok: true, delivered: true }.
  // main.js already branches on `delivered`, so it will stop opening the mail
  // draft the moment this returns true. Nothing else changes.
  // ------------------------------------------------------------------------

  return json(200, { ok: true, delivered: false });
}

// Pages routes POST to onRequestPost above; this catches everything else.
export const onRequest = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });

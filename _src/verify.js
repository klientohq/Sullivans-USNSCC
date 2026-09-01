#!/usr/bin/env node
/**
 * The Sullivans USNSCC - pre-push gate.
 *
 * Replaces the old scripts/verify-site.js, which asserted the presence of the
 * WooCommerce cart, checkout, and cart-core.js that ADR-012 deleted.
 * Everything checked here is a rule from brain/DECISIONS.md or
 * references/design-system.md, so a passing gate means those rules still hold.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = __dirname;
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);
const read = (p) => fs.readFileSync(p, 'utf8');

const pageSources = fs.readdirSync(path.join(SRC, 'pages')).filter((n) => n.endsWith('.html'));
const builtPages = fs.readdirSync(ROOT).filter((n) => n.endsWith('.html'));

// --- 1. Every page at the repo root is generated ------------------------------
// A hand-edited stray at the root is the "two versions of one file" defect that
// caused metadata to drift across 11 pages in the first place.
for (const file of builtPages) {
  if (!pageSources.includes(file)) fail(`${file}: at repo root but has no _src/pages source (hand-written stray)`);
}
for (const file of pageSources) {
  if (!builtPages.includes(file)) fail(`_src/pages/${file}: never built - run npm run build`);
}

// --- 2. Local link targets resolve -------------------------------------------
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const match of source.matchAll(/(?:href|src)="\.\/([^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (!fs.existsSync(path.join(ROOT, match[1]))) fail(`${file}: broken local link -> ${match[1]}`);
  }
}

// --- 3. Retired systems are not linked ---------------------------------------
// ADR-005 / ADR-010: WordPress and the fake cart are being retired.
const RETIRED = [
  ['./cart.html', 'the deleted static cart'],
  ['./checkout.html', 'the deleted static checkout'],
  ['cart-core.js', 'the deleted static cart catalogue'],
  ['thesullivansusnscc.com/cart/', 'the WooCommerce cart'],
  ['thesullivansusnscc.com/checkout/', 'the WooCommerce checkout'],
  ['thesullivansusnscc.com/my-account/', 'the WordPress account area'],
];
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const [needle, label] of RETIRED) {
    if (source.includes(needle)) fail(`${file}: links to ${label} (${needle}) - retired by ADR-005/ADR-012`);
  }
}

// --- 4. Placeholder and invented-content guards ------------------------------
// Rule 3: never publish an unverified official fact. Rule: no filler copy.
const FORBIDDEN = [
  'Preview Only', 'Online payment is being set up', 'Details saved.',
  'Payment options coming soon', 'Cadet dashboard coming next.', '>Cadet Login<',
  'Lorem ipsum', 'empowering tomorrow', '1961', 'federally chartered', 'TODO', 'FIXME', 'XXX',
];
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const phrase of FORBIDDEN) {
    if (source.toLowerCase().includes(phrase.toLowerCase())) fail(`${file}: forbidden placeholder or unverified claim -> "${phrase}"`);
  }
}

// --- 4b. Confirmed unit facts, and the one funnel rule (ADR-018) -------------
// The "1961" claim survived a whole session because the gate banned only the
// exact string "since 1961". These are written as patterns for that reason.

// Ages confirmed by MIDN Rivas, PAO, 2026-08-24: NLCC 10 to 13, NSCC 13 through
// high school graduation. A bare upper age of 17 excludes an eighteen-year-old
// senior, and "10 to 12" / "13 to 17" were live on three pages until 2026-08-24.
const AGE_CLAIMS = [
  [/\b10\s*(?:to|-|through|\u2013)\s*12\b/i, 'NLCC upper age is 13, not 12'],
  [/\b13\s*(?:to|-|through|\u2013)\s*17\b/i, 'Sea Cadets run to 18 or high school graduation, not 17'],
  [/ages?\s+10\s*(?:to|-|through|\u2013)\s*17\b/i, 'excludes an eighteen-year-old senior'],
];
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const [pattern, why] of AGE_CLAIMS) {
    const hit = source.match(pattern);
    if (hit) fail(`${file}: unconfirmed age range "${hit[0]}" - ${why}. See references/program.md`);
  }
}

// Cross-origin connection hints. A preconnect is a real network contact made on
// arrival, before the visitor does anything, and it is invisible in the rendered
// page. The site shipped `preconnect https://klientohq.github.io` on every page
// of both hosts until 2026-09-01, which handed GitHub the visitor IP and made
// privacy.html's "the map is the only third party" claim untrue (ADR-022).
// Same class as the Maps cookie: a privacy claim is a claim about the code.
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const [tag, rel, href] of source.matchAll(/<link[^>]*\srel="(preconnect|dns-prefetch|preload|prefetch|modulepreload)"[^>]*\shref="(https?:\/\/[^"]+)"/gi)) {
    fail(`${file}: cross-origin ${rel} to ${href} - that contacts a third party on arrival, before the visitor acts. privacy.html says only the click-to-load map does that.`);
  }
  for (const [, href, rel] of source.matchAll(/<link[^>]*\shref="(https?:\/\/[^"]+)"[^>]*\srel="(preconnect|dns-prefetch|preload|prefetch|modulepreload)"/gi)) {
    fail(`${file}: cross-origin ${rel} to ${href} - that contacts a third party on arrival, before the visitor acts. privacy.html says only the click-to-load map does that.`);
  }
}

// Reply-time promise. The site said "usually within two days" in five places
// plus the contact form's success message, and nobody had ever confirmed the
// division could keep it. Camilo set it to a week on 2026-09-01. This is a
// promise made to a parent, so it is a published claim like any other: a
// tighter number goes back in only when someone commits to answering that fast.
const REPLY_PROMISE = /\b(?:within|in)\s+(?:two|2|three|3|a\s+few|24|48|72)\s*(?:-|\u2013)?\s*(?:days?|hours?|hrs?)\b/i;
for (const file of [...builtPages, 'main.js']) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const hit = read(full).match(REPLY_PROMISE);
  if (hit) fail(`${file}: reply-time promise "${hit[0]}" - only "within a week" is confirmed (Camilo, 2026-09-01). A faster promise needs someone who commits to keeping it.`);
}

// Map embeds. Two separate defects, one on each page, found 2026-08-26:
//  - contact used maps.google.com/maps?...&output=embed, the legacy form, which
//    sets Google's NID THIRD-PARTY COOKIE. That is a Lighthouse best-practices
//    failure and it made privacy.html's "no cookies" claim untrue.
//  - index used the right form with a FABRICATED place reference: a null place
//    id (:0x0) and coordinates a kilometre off, so the map showed Niagara Square
//    beneath a heading saying the unit is based at the Naval & Military Park.
// A wrong map is a wrong published fact (Rule 3), not a styling detail.
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const [, src] of source.matchAll(/<iframe[^>]*\ssrc="([^"]*)"/gi)) {
    if (/maps\.google\.com\/maps\?/.test(src) || /[?&]output=embed/.test(src)) {
      fail(`${file}: legacy Google Maps embed (maps.google.com/...output=embed) sets the NID third-party cookie - use https://www.google.com/maps/embed?pb=`);
    }
    if (/\/maps\/embed/.test(src) && /!1s[^!]*(?:%3A|:)0x0(?:!|$)/.test(src)) {
      fail(`${file}: Google Maps embed carries a null place id (:0x0), so it centres on raw coordinates with no marker - use the real place reference`);
    }
  }
}

// No Google Maps frame may exist in the shipped HTML. Any Maps iframe sets
// Google's NID cookie the instant it loads, and privacy.html tells families the
// site sets none. The maps are click-to-load: main.js creates the frame only
// after a press, so the claim stays true for anyone who does not ask for a map.
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const [tag, src] of source.matchAll(/<iframe[^>]*\ssrc="([^"]*)"[^>]*>/gi)) {
    if (/google\.com\/maps|maps\.google\.com/.test(src)) {
      fail(`${file}: a Google Maps <iframe> ships in the HTML, so it loads on arrival and sets the NID cookie - use the click-to-load [data-map-embed] button instead`);
    }
    void tag;
  }
}

// ADR-018: seacadets.org/join is a NATIONAL UNIT PICKER. A visitor who lands
// there can select any unit, so every recruiting CTA must route through our own
// Join page, which names The Sullivans Division. Two doors are permitted: the
// handoff on join.html itself, and the footer's clearly labelled national link.
const NATIONAL_JOIN = /seacadets\.org\/join/g;
const JOIN_EXEMPT = new Set(['join.html']);
for (const file of builtPages) {
  if (JOIN_EXEMPT.has(file)) continue;
  const source = read(path.join(ROOT, file));
  // strip the footer, whose labelled national link is the permitted exception
  const body = source.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  // JSON-LD may describe the national process in prose; only <a href> is a door
  const hrefs = body.match(/href="[^"]*seacadets\.org\/join[^"]*"/gi) || [];
  if (hrefs.length) {
    fail(`${file}: ${hrefs.length} link(s) straight to the national unit picker - ADR-018 routes every join CTA through ./join.html`);
  }
  NATIONAL_JOIN.lastIndex = 0;
}

// Grade bands were published as official eligibility ("5th through 8th" /
// "9th through 12th") with no source, and they contradicted the confirmed ages:
// a thirteen-year-old NSCC cadet is usually in 7th or 8th grade. Removed
// 2026-08-26 on Camilo's ruling. Ages are the only bracket the site publishes.
const GRADE_CLAIMS = /\b(?:5th|6th|7th|8th|9th|10th|11th|12th)\s*(?:to|-|through|–)\s*(?:5th|6th|7th|8th|9th|10th|11th|12th)\b/i;
for (const file of builtPages) {
  const hit = read(path.join(ROOT, file)).match(GRADE_CLAIMS);
  if (hit) fail(`${file}: publishes a school grade band "${hit[0]}" - only the confirmed AGE ranges are published (references/program.md)`);
}

// One reply-time promise, not several. The site carried "usually within two
// days" on four pages and "within a few days" on two, which is a promise a
// parent can catch us breaking. Any new phrasing has to join the same wording.
const REPLY_CLAIM = /(?:reply|answers?|respond|get back to you)[^.<]{0,60}?within\s+(?:a\s+few\s+days|[a-z]+\s+days|\d+\s+days)/gi;
const replyPhrases = new Set();
for (const file of builtPages) {
  for (const m of read(path.join(ROOT, file)).matchAll(REPLY_CLAIM)) {
    replyPhrases.add(m[0].replace(/\s+/g, ' ').toLowerCase().replace(/^.*?(within .*)$/, '$1'));
  }
}
if (replyPhrases.size > 1) {
  fail(`the site makes ${replyPhrases.size} different reply-time promises (${[...replyPhrases].join(' / ')}) - pick one wording`);
}

// A privacy page is the site's only statement that it collects nothing, so it
// has to exist and stay reachable from every page rather than be orphaned.
if (!builtPages.includes('privacy.html')) fail('privacy.html is missing');
for (const file of builtPages) {
  if (file === 'privacy.html' || file === '404.html') continue;
  if (!/href="\.\/privacy\.html"/.test(read(path.join(ROOT, file)))) {
    fail(`${file}: no link to the privacy page - it is reachable only from pages that link it`);
  }
}

// --- 5. Secrets never reach a public repo (Rule 4) ---------------------------
const SECRET_PATTERNS = [
  [/sk_live_[A-Za-z0-9]{8,}/, 'Stripe live secret key'],
  [/sk_test_[A-Za-z0-9]{8,}/, 'Stripe test secret key'],
  [/AIza[0-9A-Za-z_-]{30,}/, 'Google API key'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/EAAG[A-Za-z0-9]{20,}/, 'Facebook access token'],
];
const scanForSecrets = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'assets', 'USNSCC', 'project-work'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { scanForSecrets(full); continue; }
    if (!/\.(html|js|json|css|txt|md|xml)$/.test(entry.name)) continue;
    const source = read(full);
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(source)) fail(`${path.relative(ROOT, full)}: looks like a committed ${label}`);
    }
  }
};
scanForSecrets(ROOT);

// --- 6. Discoverability: every indexable page carries full metadata ----------
// This is the class of bug that made all 11 pages share zero OG tags.
const REQUIRED_META = [
  [/<title>[^<]{15,70}<\/title>/, 'a <title> of 15-70 characters'],
  [/<meta name="description" content="[^"]{50,200}"/, 'a meta description of 50-200 characters'],
  [/<link rel="canonical" href="https?:\/\/[^"]+"/, 'a canonical URL'],
  [/<meta property="og:title" content="[^"]+"/, 'og:title'],
  [/<meta property="og:description" content="[^"]+"/, 'og:description'],
  [/<meta property="og:image" content="https?:\/\/[^"]+"/, 'an absolute og:image'],
  [/<meta name="twitter:card" content="summary_large_image"/, 'a Twitter card'],
];
const titles = new Map();
const descriptions = new Map();
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  const noindex = /<meta name="robots" content="noindex/.test(source);
  for (const [pattern, label] of REQUIRED_META) {
    if (!pattern.test(source)) {
      const message = `${file}: missing ${label}`;
      noindex ? warn(message) : fail(message);
    }
  }
  if (noindex) continue;
  const title = source.match(/<title>([^<]*)<\/title>/)?.[1];
  const description = source.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (title) {
    if (titles.has(title)) fail(`${file}: duplicate <title> shared with ${titles.get(title)}`);
    titles.set(title, file);
  }
  if (description) {
    if (descriptions.has(description)) fail(`${file}: duplicate meta description shared with ${descriptions.get(description)}`);
    descriptions.set(description, file);
  }
}

// --- 7. Accessibility floor (ADR-008, WCAG 2.2 AA) ---------------------------
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));

  const h1s = source.match(/<h1[\s>]/g) || [];
  if (h1s.length === 0) fail(`${file}: no <h1>`);
  if (h1s.length > 1) fail(`${file}: ${h1s.length} <h1> elements, expected exactly 1`);

  const levels = [...source.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      fail(`${file}: heading level jumps from h${levels[i - 1]} to h${levels[i]}`);
      break;
    }
  }

  for (const img of source.match(/<img\b[^>]*>/g) || []) {
    if (!/\salt=/.test(img)) fail(`${file}: <img> without an alt attribute -> ${img.slice(0, 90)}`);
  }

  // BUG-004: non-descriptive link text hurts screen readers and SEO alike.
  for (const match of source.matchAll(/<a\b[^>]*>([\s\S]{0,80}?)<\/a>/g)) {
    const text = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (['click here', 'here', 'read more', 'learn more', 'more', 'this link', 'link'].includes(text)) {
      fail(`${file}: non-descriptive link text -> "${text}"`);
    }
  }

  if (/<a\b[^>]*target="_blank"(?![^>]*rel="[^"]*noopener)/.test(source)) {
    fail(`${file}: target="_blank" without rel="noopener"`);
  }
}

// --- 8. House style and design-system bans -----------------------------------
// Camilo's standing rule: never an em dash in anything we author.
// design-system.md: emoji are never interface iconography.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F02F}]/u;
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  if (source.includes('—')) fail(`${file}: contains an em dash (house style forbids them in authored copy)`);
  if (EMOJI.test(source)) fail(`${file}: contains emoji (design-system.md bans emoji as iconography)`);
}

// --- 9. Token discipline -----------------------------------------------------
// z-index by guesswork was a contributing cause of BUG-001.
const css = read(path.join(ROOT, 'styles.css'));
const rawZ = [...css.matchAll(/z-index:\s*(-?\d+)/g)];
if (rawZ.length) {
  fail(`styles.css: ${rawZ.length} hard-coded z-index values (${rawZ.slice(0, 6).map((m) => m[1]).join(', ')}) - use the --z-* ladder`);
}
if (/z-index:[^;]*!important/.test(css)) fail('styles.css: z-index with !important - the ladder should make this unnecessary');

// The focus ring is a token, not a colour typed at a call site. A stale
// `:focus-visible { outline: 3px solid var(--gold-500) }` in the legacy sheet
// silently overrode the tokenised rule and put a 2.19:1 ring on every light
// page, three of them 1:1 on a gold button. Lighthouse has no audit for focus
// contrast, so 100/100/100 held the whole time (WCAG 2.2 AA 1.4.11).
for (const m of css.matchAll(/:focus-visible[^{]*\{([^}]*)\}/g)) {
  const block = m[1];
  const outline = block.match(/outline(?:-color)?:\s*([^;]+)/);
  if (!outline) continue;
  if (!/var\(--focus-ring/.test(outline[1])) {
    fail(`styles.css: a :focus-visible rule sets "outline: ${outline[1].trim()}" instead of var(--focus-ring) - dark surfaces redefine that token, a literal colour cannot follow the surface`);
  }
}

// A dark section that is not in the inverted-surface list keeps the LIGHT ink
// roles, including --focus-ring, so a focus ring lands at 2.9:1 on navy. Two
// sections (.callout, .chart-section) had drifted out of that list and were
// papering over it with per-element `color: white`, which is the exact pattern
// the token block replaced. Any new dark section joins the list or the
// allowlist below, which is where the "nothing focusable in it" judgement lives.
const DARK_BG = /background(?:-color)?:\s*[^;]*var\(--(?:navy-800|navy-900|navy-950|surface-inverse)\)/;
const NOTHING_FOCUSABLE = new Set([
  '.media-band figure', '.stats-bar', '.primary-command', '.tier-card.tier-feature',
  '.join-hero-media', '.recruit-card a', '.info-social a:hover',
]);
const invertedBlock = css.match(/([^{}@]+)\{[^{}]*--focus-ring:\s*var\(--focus-ring-inverse\)/);
const inverted = new Set(
  (invertedBlock ? invertedBlock[1] : '').split(',').map((t) => t.replace(/\/\*[\s\S]*?\*\//g, '').trim()).filter(Boolean)
);
if (!inverted.size) fail('styles.css: no inverted-surface block declares --focus-ring - the ring can no longer follow the surface');
for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
  if (!selector || selector.startsWith('@') || !DARK_BG.test(m[2])) continue;
  for (const one of selector.split(',').map((t) => t.trim())) {
    if (!one || one.includes(':hover') || one.includes('::')) continue;
    if (inverted.has(one) || NOTHING_FOCUSABLE.has(one)) continue;
    // a compound like `.site-header.is-scrolled` counts if its base is listed
    if ([...inverted].some((known) => one.startsWith(known + '.') || one.startsWith(known + ':') || one.startsWith(known + ' '))) continue;
    fail(`styles.css: "${one}" paints a dark background but is not an inverted surface - add it beside .u-on-dark in 02-base.css so --ink and --focus-ring follow it`);
  }
}

// A control hidden with opacity alone stays in the tab order, so a keyboard
// visitor lands on something invisible. The sticky Join pill did exactly that.
const stickyHidden = css.match(/\.sticky-join\s*\{[^}]*opacity:\s*0[^}]*\}/);
if (stickyHidden && !/visibility:\s*hidden/.test(stickyHidden[0])) {
  fail('styles.css: .sticky-join is hidden with opacity:0 but stays focusable - add visibility:hidden so it leaves the tab order');
}

// --- 9b. Cache busting actually busts ----------------------------------------
// A stale ?v= string serves old CSS to every returning visitor after a deploy.
const crypto = require('node:crypto');
const expectedVersion = crypto
  .createHash('sha256')
  .update(read(path.join(ROOT, 'styles.css')) + read(path.join(ROOT, 'main.js')))
  .digest('hex')
  .slice(0, 10);
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const [, asset, version] of source.matchAll(/\.\/(styles\.css|main\.js)\?v=([\w.-]+)/g)) {
    if (version !== expectedVersion) {
      fail(`${file}: ${asset} is cache-busted with "${version}" but the built bytes hash to "${expectedVersion}" - rebuild`);
    }
  }
}

// --- 10. Generated artefacts exist -------------------------------------------
for (const artefact of ['sitemap.xml', 'robots.txt', 'styles.css', 'main.js']) {
  if (!fs.existsSync(path.join(ROOT, artefact))) fail(`missing ${artefact}`);
}
const sitemap = read(path.join(ROOT, 'sitemap.xml'));
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  if (/<meta name="robots" content="noindex/.test(source)) {
    const loc = file === 'index.html' ? '/</loc>' : `/${file}</loc>`;
    if (sitemap.includes(loc)) fail(`sitemap.xml: lists ${file}, which is noindex`);
  }
}

// --- report ------------------------------------------------------------------
for (const warning of warnings) console.warn(`  warn  ${warning}`);
if (failures.length) {
  console.error(`\nGate FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`  fail  ${failure}`);
  process.exit(1);
}
console.log(`Gate passed: ${builtPages.length} pages, ${warnings.length} warnings.`);

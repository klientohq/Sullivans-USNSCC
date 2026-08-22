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
  'Lorem ipsum', 'empowering tomorrow', 'since 1961', 'TODO', 'FIXME', 'XXX',
];
for (const file of builtPages) {
  const source = read(path.join(ROOT, file));
  for (const phrase of FORBIDDEN) {
    if (source.toLowerCase().includes(phrase.toLowerCase())) fail(`${file}: forbidden placeholder or unverified claim -> "${phrase}"`);
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

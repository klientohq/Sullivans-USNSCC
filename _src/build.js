#!/usr/bin/env node
/**
 * The Sullivans USNSCC - static site build.
 *
 * Zero dependencies by design (ADR-013). Reads _src/pages/*.html, wraps each in
 * its layout, resolves partials, and writes plain HTML to the repo root so the
 * repo root stays the deployable artifact on both GitHub Pages and Cloudflare
 * Pages. Nothing here runs at request time.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const SRC = __dirname;
const ROOT = path.resolve(SRC, '..');

const read = (p) => fs.readFileSync(p, 'utf8');
const site = JSON.parse(read(path.join(SRC, 'data', 'site.json')));

// Every other _src/data/*.json is exposed to templates under its filename, so a
// catalogue change is a data edit rather than a markup edit.
const data = {};
for (const file of fs.readdirSync(path.join(SRC, 'data'))) {
  if (!file.endsWith('.json') || file === 'site.json') continue;
  data[file.replace(/\.json$/, '')] = JSON.parse(read(path.join(SRC, 'data', file)));
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function lookup(ctx, key) {
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), ctx);
}

function truthy(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

/**
 * Minimal mustache-shaped renderer.
 *   {{> name}}          partial from _src/partials/name.html
 *   {{#if k}}…{{/if}}   {{#unless k}}…{{/unless}}   {{#each k}}…{{/each}}
 *   {{{ k }}}           raw     {{ k }}  HTML-escaped
 * Blocks are resolved innermost-first so nesting works without a real parser.
 */
function render(template, ctx, depth = 0) {
  if (depth > 12) throw new Error('template recursion limit exceeded');
  let out = template;

  out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    const file = path.join(SRC, 'partials', `${name}.html`);
    if (!fs.existsSync(file)) throw new Error(`missing partial: ${name}`);
    return render(read(file), ctx, depth + 1);
  });

  // Innermost block first: the body may not contain another block opener.
  const block = /\{\{#(if|unless|each)\s+([\w.]+)\s*\}\}((?:(?!\{\{#(?:if|unless|each)\s)[\s\S])*?)\{\{\/\1\}\}/;
  let guard = 0;
  while (block.test(out)) {
    if (guard++ > 500) throw new Error('template block limit exceeded');
    out = out.replace(block, (_, kind, key, body) => {
      const value = lookup(ctx, key);
      if (kind === 'if') return truthy(value) ? render(body, ctx, depth + 1) : '';
      if (kind === 'unless') return truthy(value) ? '' : render(body, ctx, depth + 1);
      if (!Array.isArray(value)) return '';
      return value
        .map((item) =>
          render(body, { ...ctx, ...(item && typeof item === 'object' ? item : { this: item }) }, depth + 1)
        )
        .join('');
    });
  }

  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
    const value = lookup(ctx, key);
    return value == null ? '' : String(value);
  });

  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = lookup(ctx, key);
    return value == null ? '' : escapeHtml(value);
  });

  return out;
}

/** Split `---\n{json}\n---\n<body>` into [meta, body]. */
function parsePage(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing JSON front matter`);
  let meta;
  try {
    meta = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`${file}: front matter is not valid JSON - ${error.message}`);
  }
  return [meta, match[2]];
}

// --- cache busting -----------------------------------------------------------
// assetVersion is derived from the built bytes, never hand-maintained. A
// hand-set version silently serves stale CSS to every returning visitor after a
// deploy, which is exactly what happened on 2026-08-22.
const fingerprint = (contents) => crypto.createHash('sha256').update(contents).digest('hex').slice(0, 10);

// --- scripts ----------------------------------------------------------------
const mainJs = read(path.join(SRC, 'js', 'main.js'));
fs.writeFileSync(path.join(ROOT, 'main.js'), mainJs);

// --- stylesheet -------------------------------------------------------------
// Concatenated in order so the cascade is explicit: tokens, then fonts, then
// base, then everything still living in the legacy sheet. One served file.
const cssDir = path.join(SRC, 'css');
// Numeric filename prefixes are the cascade order: 00 tokens, 01 fonts,
// 02 base, 50 legacy, 60+ rebuilt components that supersede legacy rules.
const cssOrder = fs.readdirSync(cssDir).filter((n) => n.endsWith('.css')).sort();
const cssBundle = cssOrder.map((n) => `/* @source _src/css/${n} */\n${read(path.join(cssDir, n))}`).join('\n\n');
fs.writeFileSync(path.join(ROOT, 'styles.css'), cssBundle);

site.assetVersion = fingerprint(cssBundle + mainJs);

const pagesDir = path.join(SRC, 'pages');
const pageFiles = fs.readdirSync(pagesDir).filter((n) => n.endsWith('.html')).sort();
const pages = pageFiles.map((file) => {
  const [meta, body] = parsePage(read(path.join(pagesDir, file)), file);
  return { file, meta, body, slug: meta.slug || file.replace(/\.html$/, '') };
});

// --- structured data --------------------------------------------------------
// Organization on the homepage, BreadcrumbList on every inner page. Deliberately
// NOT LocalBusiness: that schema wants a street address and opening hours, and
// this unit does not publish where a group of minors gathers or when.
const organization = {
  '@context': 'https://schema.org',
  '@type': 'NGO',
  name: site.fullName,
  alternateName: site.name,
  url: `${site.url}/`,
  logo: `${site.url}/assets/images/logo.webp`,
  email: site.email,
  areaServed: { '@type': 'City', name: `${site.locality}, ${site.regionName}` },
  parentOrganization: { '@type': 'NGO', name: 'U.S. Naval Sea Cadet Corps', url: site.nationalUrl },
  sameAs: site.social.map((s) => s.href),
  description:
    'A congressionally chartered non-profit youth program in Buffalo, New York for ages 10 through high school. Participation carries no military service obligation.',
};

const breadcrumb = (page) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
    { '@type': 'ListItem', position: 2, name: page.meta.ogTitle || page.meta.title, item: `${site.url}/${page.slug}.html` },
  ],
});

const written = [];
for (const page of pages) {
  const { meta, body, slug } = page;
  const [content, afterMain = ''] = body.split(/<!--\s*@after-main\s*-->/);

  // Nav is data-driven so the active item can never drift out of sync.
  const nav = site.nav.map((item) => ({ ...item, current: item.slug === slug }));
  const canonical = `${site.url}/${slug === 'index' ? '' : `${slug}.html`}`;
  const ogImage = meta.ogImage ? `${site.url}/${meta.ogImage}` : `${site.url}/${site.defaultOgImage}`;

  const ctx = {
    ...meta,
    ...data,
    site,
    nav,
    slug,
    canonical,
    ogImage,
    ogType: meta.ogType || 'website',
  };

  // Page bodies are templates in their own right, so they are rendered before
  // being placed into the layout. Injecting them afterwards would leave any
  // {{#each}} in a page body unprocessed.
  ctx.content = render(content, ctx);
  ctx.afterMain = afterMain.trim() ? render(afterMain, ctx) : '';
  ctx.hasAfterMain = ctx.afterMain.length > 0;

  // A page may declare its own JSON-LD; it is combined with the automatic graph
  // rather than replacing it, so no page can silently lose its breadcrumb.
  const graph = slug === 'index' ? [organization] : [breadcrumb(page)];
  if (meta.jsonld) graph.push(JSON.parse(meta.jsonld));
  ctx.jsonld = JSON.stringify(graph.length === 1 ? graph[0] : graph);

  const layoutFile = path.join(SRC, 'layouts', `${meta.layout || 'base'}.html`);
  if (!fs.existsSync(layoutFile)) throw new Error(`${page.file}: missing layout ${meta.layout}`);

  const html = render(read(layoutFile), ctx)
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  const target = path.join(ROOT, `${slug}.html`);
  fs.writeFileSync(target, html);
  written.push(`${slug}.html`);
}

// sitemap.xml + robots.txt are generated from the same page list, so a new page
// can never be missing from either one.
const indexable = pages.filter((p) => p.meta.noindex !== true);
const urls = indexable
  .map((p) => {
    const loc = `${site.url}/${p.slug === 'index' ? '' : `${p.slug}.html`}`;
    const priority = p.meta.priority || (p.slug === 'index' ? '1.0' : '0.7');
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${site.buildDate}</lastmod>\n    <changefreq>${p.meta.changefreq || 'monthly'}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  })
  .join('\n');

fs.writeFileSync(
  path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);

fs.writeFileSync(
  path.join(ROOT, 'robots.txt'),
  [
    'User-agent: *',
    'Allow: /',
    'Disallow: /_src/',
    '',
    `Sitemap: ${site.url}/sitemap.xml`,
    '',
  ].join('\n')
);

console.log(`Built styles.css from ${cssOrder.length} layers (${(cssBundle.length / 1024).toFixed(1)} KB), asset version ${site.assetVersion}`);
console.log(`Built ${written.length} pages: ${written.join(', ')}`);
console.log(`Wrote sitemap.xml (${indexable.length} urls) and robots.txt`);

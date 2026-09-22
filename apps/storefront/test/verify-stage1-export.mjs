// Run after DEPLOY_TARGET=pages next build. Optional EXPORT_BASELINE compares prior HTML.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildProductUrl } from '../src/lib/product-meta.ts';
import { sitemapUrls } from '../src/lib/sitemap-urls.ts';
import { DEFAULT_LOCALE, PUBLISHED_LOCALES } from '../src/i18n/locales.ts';
import { getTranslator } from '../src/i18n/translate.ts';
import { buildLocalizedPath } from '../src/i18n/paths.ts';
import { SITE_URL } from '../src/i18n/metadata.ts';

const root = path.resolve(process.env.EXPORT_ROOT || 'out');
const snapshot = JSON.parse(fs.readFileSync('.next/cache/skufnya-build/catalog-snapshot.json', 'utf8'));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].replaceAll('&amp;', '&'));
assert.deepEqual(urls, sitemapUrls(snapshot.items.map((item) => item.slug)));
for (const url of urls) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  // uk is served unprefixed and de is not published, so neither prefix may ever be submitted.
  assert.ok(!/^\/(uk|de)(\/|$)/.test(pathname), `Unpublished locale prefix in sitemap: ${pathname}`);
  // EN product pages are exported for buyers but carry noindex, so they stay out of the sitemap.
  assert.ok(!pathname.startsWith('/en/product/'), `Non-indexable EN product page in sitemap: ${pathname}`);
  assert.ok(fs.existsSync(path.join(root, pathname, 'index.html')), `Missing export: ${pathname}`);
}
for (const locale of ['uk', 'de']) assert.equal(fs.existsSync(path.join(root, locale)), false);
assert.ok(fs.existsSync(path.join(root, 'en', 'index.html')), 'Missing EN export root');

/**
 * The global 404 is the one document outside both locale trees: a static host
 * has a single one, and Pages answers every unmatched URL with it, /en/ ones
 * included, so it is the default locale's page. The per-file pass below already
 * demands uk of it, but only these checks tell the storefront's own 404 apart
 * from Next's unbranded fallback — which is silently what the export carries
 * whenever the app has no root not-found route to own that URL.
 */
const notFound = ['404.html', '404/index.html'].map((relative) => {
  const file = path.join(root, relative);
  assert.ok(fs.existsSync(file), `Missing global 404: ${relative}`);
  return fs.readFileSync(file, 'utf8');
});
assert.equal(notFound[0], notFound[1], 'The /404.html and /404/ documents differ');
assert.doesNotMatch(notFound[0], /This page could not be found/, 'The global 404 is the Next.js fallback, not the storefront page');
assert.match(notFound[0], /<html[^>]+lang="uk"/, 'The global 404 is not the default-locale document');
assert.ok(notFound[0].includes(getTranslator(DEFAULT_LOCALE)('errors.notFound')), 'The global 404 carries no Ukrainian message');
assert.match(notFound[0], /<header[\s>]/, 'The global 404 is not rendered inside the storefront shell');
// It answers under every unmatched URL, so it may never be indexed or claim one.
assert.match(notFound[0], /<meta name="robots" content="noindex"/, 'The global 404 must stay out of the index');
assert.doesNotMatch(notFound[0], /rel="canonical"|rel="alternate"/, 'The global 404 must claim neither a canonical nor alternates');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}
function seo(html) {
  // Compare the actual rendered metadata and JSON-LD; ignore Next build IDs/assets.
  return [
    ...(html.match(/<title>.*?<\/title>|<meta\s[^>]+>|<link\s[^>]+rel="canonical"[^>]*>/gs) || []),
    ...(html.match(/<script type="application\/ld\+json">.*?<\/script>/gs) || []),
  ];
}
/** The export is flat: everything under /en is the English tree, the rest is the Ukrainian one. */
function exportLocale(relativePath) {
  return /^en(\/|\.html$)/.test(relativePath) ? 'en' : 'uk';
}
const files = htmlFiles(root);
for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const locale = exportLocale(relative);
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, new RegExp(`<html[^>]+lang="${locale}"`), `Wrong document language: ${relative}`);
  // A published page must never link into an unpublished locale.
  assert.doesNotMatch(html, /href="\/(?:uk|de)(?:\/|"|\?)/, `Link to an unpublished locale: ${relative}`);
  // Alternates are the published pair and nothing else, and both sides must really be exported.
  const alternates = [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"\/>/g)];
  for (const [, language] of alternates) {
    assert.ok(PUBLISHED_LOCALES.includes(language), `Alternate for an unpublished locale in ${relative}: ${language}`);
  }
  if (alternates.length > 0) {
    const byLanguage = Object.fromEntries(alternates.map(([, language, href]) => [language, href]));
    assert.deepEqual(Object.keys(byLanguage).sort(), ['en', 'uk'], `Incomplete alternates: ${relative}`);
    const ukPath = new URL(byLanguage.uk).pathname;
    assert.equal(byLanguage.uk, SITE_URL + buildLocalizedPath({ locale: 'uk', path: ukPath }), `Wrong uk alternate: ${relative}`);
    assert.equal(byLanguage.en, SITE_URL + buildLocalizedPath({ locale: 'en', path: ukPath }), `Wrong en alternate: ${relative}`);
    for (const href of Object.values(byLanguage)) {
      const target = path.join(root, decodeURIComponent(new URL(href).pathname), 'index.html');
      assert.ok(fs.existsSync(target), `Alternate is not exported: ${href} (from ${relative})`);
    }
  }
  if (process.env.EXPORT_BASELINE) {
    const previous = fs.readFileSync(path.join(process.env.EXPORT_BASELINE, path.relative(root, file)), 'utf8');
    assert.deepEqual(seo(html), seo(previous), `Metadata changed: ${path.relative(root, file)}`);
  }
}
for (const product of snapshot.items) {
  const ukHtml = fs.readFileSync(path.join(root, 'product', product.slug, 'index.html'), 'utf8');
  assert.ok(ukHtml.includes(`<link rel="canonical" href="${buildProductUrl(product.slug)}"`));
  assert.match(ukHtml, /<meta name="robots" content="index/, `Ukrainian product page is not indexable: ${product.slug}`);
  // Stage 2A: the EN route exists for buyers, but stays out of the index until the copy is reviewed.
  const enHtml = fs.readFileSync(path.join(root, 'en', 'product', product.slug, 'index.html'), 'utf8');
  assert.ok(enHtml.includes(`<link rel="canonical" href="${buildProductUrl(product.slug, 'en')}"`));
  assert.match(enHtml, /<meta name="robots" content="noindex/, `EN product page must not be indexed: ${product.slug}`);
}
if (process.env.EXPORT_BASELINE) {
  assert.deepEqual(files.map((f) => path.relative(root, f)), htmlFiles(process.env.EXPORT_BASELINE).map((f) => path.relative(process.env.EXPORT_BASELINE, f)));
  assert.equal(sitemap, fs.readFileSync(path.join(process.env.EXPORT_BASELINE, 'sitemap.xml'), 'utf8'));
}
console.log(JSON.stringify({ passed: true, products: snapshot.items.length, sitemapUrls: urls.length, htmlPages: files.length, locales: [...PUBLISHED_LOCALES], baselineCompared: Boolean(process.env.EXPORT_BASELINE) }));

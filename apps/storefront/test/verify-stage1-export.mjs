// Run after DEPLOY_TARGET=pages next build. Optional EXPORT_BASELINE compares prior HTML.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildProductUrl, buildProductPageMeta, buildProductJsonLd, toPlainText } from '../src/lib/product-meta.ts';
import { sitemapUrls } from '../src/lib/sitemap-urls.ts';
import { DEFAULT_LOCALE, PUBLISHED_LOCALES, LOCALE_PRESENTATION } from '../src/i18n/locales.ts';
import { getTranslator } from '../src/i18n/translate.ts';
import { buildLocalizedPath } from '../src/i18n/paths.ts';
import { SITE_URL } from '../src/i18n/metadata.ts';
import { isEnglishProductReady, getProductLocalizationVersion, resolveProductPresentation } from '../src/i18n/catalog-policy.ts';
import { validateCatalogSnapshot } from '../src/lib/snapshot-integrity.ts';

const root = path.resolve(process.env.EXPORT_ROOT || 'out');
const snapshot = JSON.parse(fs.readFileSync('.next/cache/skufnya-build/catalog-snapshot.json', 'utf8'));
assert.deepEqual(validateCatalogSnapshot(snapshot), [], 'Invalid catalog/translation snapshot');
const enReadySlugs = snapshot.items.filter(isEnglishProductReady).map(item => item.slug);
assert.match(snapshot.buildId, /^[a-zA-Z0-9-]+$/, 'Missing current catalog build ID');
const compiledBuildId = JSON.parse(fs.readFileSync('.next/required-server-files.json', 'utf8')).config.env.SKUF_CATALOG_BUILD_ID;
assert.equal(snapshot.buildId, compiledBuildId, 'Catalog snapshot belongs to a different compiled build');
const collectionRoot = path.join('.next/cache/skufnya-build', `collection-${snapshot.buildId}`);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(collectionRoot, 'catalog-snapshot.json'), 'utf8')), snapshot, 'Verifier mirror differs from the validated worker snapshot');
const completion = JSON.parse(fs.readFileSync(path.join(collectionRoot, 'result.json'), 'utf8'));
assert.equal(completion.buildId, snapshot.buildId);
assert.equal(completion.result.count, snapshot.items.length);
assert.deepEqual(completion.result.slugs, snapshot.items.map(item => item.slug));
assert.equal(fs.existsSync(path.join(collectionRoot, 'failed')), false, 'Failed catalog collection cannot be published');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].replaceAll('&amp;', '&'));
assert.deepEqual(urls, sitemapUrls(snapshot.items.map((item) => item.slug), enReadySlugs));
for (const url of urls) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  // uk is served unprefixed and de is not published, so neither prefix may ever be submitted.
  assert.ok(!/^\/(uk|de)(\/|$)/.test(pathname), `Unpublished locale prefix in sitemap: ${pathname}`);
  if (pathname.startsWith('/en/product/')) assert.ok(enReadySlugs.includes(pathname.split('/')[3]), `Non-indexable EN product in sitemap: ${pathname}`);
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
function metaContent(html, attribute, name) {
  return html.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`))?.[1];
}
function productJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(match, 'Missing Product JSON-LD');
  return JSON.parse(match[1]);
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
  if (!relative.startsWith('404')) {
    const pathname = '/' + relative.replace(/index\.html$/, '');
    assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${pathname}"`), `Wrong self canonical: ${relative}`);
    assert.equal(metaContent(html, 'property', 'og:locale'), LOCALE_PRESENTATION[locale].openGraphLocale, `Wrong OG locale: ${relative}`);
    for (const [attribute, key] of [['name', 'description'], ['property', 'og:title'], ['property', 'og:description'], ['name', 'twitter:title'], ['name', 'twitter:description']]) {
      assert.ok(metaContent(html, attribute, key)?.trim(), `Missing ${key}: ${relative}`);
    }
  }
  assert.doesNotMatch(html, /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?=[:/\"])/i, `Development host URL: ${relative}`);
  assert.doesNotMatch(html, /<a\b[^>]*href="\/(?:en\/)?(?:_[^/"]*|api|uploads)(?:\/|")/, `Internal route in navigation: ${relative}`);
  if (relative.startsWith('404')) {
    for (const [, href] of html.matchAll(/<a[^>]*hrefLang="en"[^>]*href="([^"]*)"/g)) {
      assert.equal(href, '/en/', 'Static 404 switcher must target an exported home');
    }
    assert.ok(metaContent(html, 'property', 'og:image')?.startsWith(SITE_URL + '/'), '404 OG image must use production origin');
  }
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
function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}
const imageResolver = value => value ? /^https?:\/\//i.test(value) ? value : `https://api.skufnya.com${value}` : null;
for (const product of snapshot.items) {
  const ready = isEnglishProductReady(product), version = getProductLocalizationVersion(product);
  const ukHtml = fs.readFileSync(path.join(root, 'product', product.slug, 'index.html'), 'utf8');
  const enHtml = fs.readFileSync(path.join(root, 'en', 'product', product.slug, 'index.html'), 'utf8');
  for (const [locale, html] of [['uk', ukHtml], ['en', enHtml]]) {
    const presentation = resolveProductPresentation(product, locale);
    assert.ok(html.includes(`<link rel="canonical" href="${buildProductUrl(product.slug, locale)}"`));
    assert.equal(metaContent(html, 'name', 'skufnya-en-content-version'), version, `Wrong content version: ${locale}/${product.slug}`);
    const robots = (metaContent(html, 'name', 'robots') || '').split(/\s*,\s*/);
    assert.ok(robots.includes('follow'));
    assert.equal(robots.includes('noindex'), locale === 'en' && !ready, `Wrong indexability: ${locale}/${product.slug}`);
    if (locale === 'uk' || ready) assert.ok(robots.includes('index'));
    assert.equal(urls.includes(buildProductUrl(product.slug, locale)), locale === 'uk' || ready, `Wrong sitemap eligibility: ${locale}/${product.slug}`);
    if (ready) {
      for (const alternateLocale of ['uk', 'en']) assert.ok(html.includes(`<link rel="alternate" hrefLang="${alternateLocale}" href="${buildProductUrl(product.slug, alternateLocale)}"`), `Missing reciprocal alternate: ${locale}/${product.slug}`);
    } else assert.doesNotMatch(html, /<link rel="alternate"/, `Untranslated product alternate: ${product.slug}`);
    const heading = html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1];
    assert.equal(toPlainText(decodeHtml(heading || '')), toPlainText(presentation.title), `Wrong static product title: ${locale}/${product.slug}`);
    const meta = buildProductPageMeta(presentation, imageResolver, locale);
    assert.equal(decodeHtml(metaContent(html, 'property', 'og:image:alt') || ''), meta.image.alt, `Wrong image alt: ${locale}/${product.slug}`);
    for (const [attribute, key, expected] of [
      ['name', 'description', meta.description], ['property', 'og:title', meta.socialTitle],
      ['property', 'og:description', meta.description], ['name', 'twitter:title', meta.socialTitle], ['name', 'twitter:description', meta.description],
    ]) assert.equal(decodeHtml(metaContent(html, attribute, key) || ''), expected, `Wrong ${key}: ${locale}/${product.slug}`);
    assert.equal(decodeHtml(html.match(/<title>(.*?)<\/title>/s)?.[1] || ''), `${meta.documentTitle} | SKUFnya`, `Wrong SEO title: ${locale}/${product.slug}`);
    const actualLd = productJsonLd(html), expectedLd = buildProductJsonLd(presentation, imageResolver, locale);
    // Media origin is a build setting; the identity, presentation and offers must match exactly.
    for (const key of ['name', 'description', 'sku', 'brand', 'category', 'url', 'offers']) assert.deepEqual(actualLd[key], expectedLd[key], `Wrong JSON-LD ${key}: ${locale}/${product.slug}`);
  }
  if (ready) assert.ok(!enHtml.includes(getTranslator('en')('catalog.sourceNotice')), `Ready product displays fallback notice: ${product.slug}`);
  else assert.ok(enHtml.includes(getTranslator('en')('catalog.sourceNotice')), `Missing source-language notice: ${product.slug}`);
  const ukData = productJsonLd(ukHtml), enData = productJsonLd(enHtml);
  for (const key of ['sku', 'image']) assert.deepEqual(enData[key], ukData[key], `Locale changed commerce data ${key}: ${product.slug}`);
  if (!ready) for (const key of ['name', 'description', 'brand', 'category']) assert.deepEqual(enData[key], ukData[key], `Changed fallback catalog data ${key}: ${product.slug}`);
  for (const key of ['price', 'priceCurrency', 'availability', 'hasMerchantReturnPolicy']) assert.deepEqual(enData.offers?.[key], ukData.offers?.[key], `Locale changed offer ${key}: ${product.slug}`);
  assert.equal(enData.url, buildProductUrl(product.slug, 'en'));
  assert.equal(enData.offers?.price, product.priceFrom);
  assert.equal(enData.offers?.priceCurrency, product.currency);
}
if (process.env.EXPORT_BASELINE) {
  assert.deepEqual(files.map((f) => path.relative(root, f)), htmlFiles(process.env.EXPORT_BASELINE).map((f) => path.relative(process.env.EXPORT_BASELINE, f)));
  assert.equal(sitemap, fs.readFileSync(path.join(process.env.EXPORT_BASELINE, 'sitemap.xml'), 'utf8'));
}
console.log(JSON.stringify({ passed: 1, failed: 0, skipped: 0, products: snapshot.items.length, ukProductPages: snapshot.items.length, enProductRoutes: snapshot.items.length, enIndexableProducts: enReadySlugs.length, nonReadyProducts: snapshot.items.length - enReadySlugs.length, catalogBuildId: snapshot.buildId, ukHtmlPages: files.filter(f => exportLocale(path.relative(root, f).split(path.sep).join('/')) === 'uk').length, enHtmlPages: files.filter(f => exportLocale(path.relative(root, f).split(path.sep).join('/')) === 'en').length, sitemapUrls: urls.length, htmlPages: files.length, locales: [...PUBLISHED_LOCALES], baselineCompared: Boolean(process.env.EXPORT_BASELINE) }));

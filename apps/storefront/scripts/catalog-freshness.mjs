// Read-only live content/availability check, independent of the build snapshot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function uniqueSlugs(slugs, label) {
  assert.ok(Array.isArray(slugs), `${label}: expected slugs`);
  for (const slug of slugs) assert.ok(typeof slug === 'string' && slug.length && !/[/?#\\]/.test(slug) && !['.', '..'].includes(slug), `${label}: invalid slug`);
  assert.equal(new Set(slugs).size, slugs.length, `${label}: duplicate slugs`);
  return new Set(slugs);
}
export function compareCatalogSlugs(liveSlugs, exportedSlugs) {
  const live = uniqueSlugs(liveSlugs, 'live'), exported = uniqueSlugs(exportedSlugs, 'exported');
  return {
    liveProducts: live.size, exportedProducts: exported.size,
    missing: [...live].filter(s => !exported.has(s)).sort(),
    stale: [...exported].filter(s => !live.has(s)).sort(),
  };
}
export function productSlugsFromSitemap(xml, origin, locale = 'uk') {
  assert.ok(['uk', 'en'].includes(locale), 'Invalid sitemap locale');
  assert.match(xml, /<urlset[\s>]/, 'Invalid sitemap');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1].replaceAll('&amp;', '&')));
  assert.ok(urls.length, 'Empty sitemap');
  const prefix = locale === 'en' ? '/en/product/' : '/product/';
  for (const u of urls) {
    assert.equal(u.origin, origin, 'Unexpected sitemap origin');
    assert.ok(!/^\/(uk|de)(\/|$)/.test(u.pathname), 'Unpublished locale in sitemap');
    if (/^\/(en\/)?product\//.test(u.pathname)) assert.match(u.pathname, /^\/(en\/)?product\/[^/]+\/$/, 'Invalid product URL/trailing slash');
  }
  const slugs = urls.filter(u => u.pathname.startsWith(prefix)).map(u => decodeURIComponent(u.pathname.slice(prefix.length, -1)));
  uniqueSlugs(slugs, `${locale} sitemap`);
  return slugs;
}
export function readEnglishState(product) {
  const absent = product.localization === undefined && product.translations === undefined;
  if (absent) return { ready: false, version: null, title: null };
  assert.ok(product.localization && typeof product.localization === 'object' && !Array.isArray(product.localization), 'Invalid localization envelope');
  assert.deepEqual(Object.keys(product.localization), ['en'], 'Unpublished localization envelope');
  const state = product.localization.en;
  assert.ok(state && typeof state.ready === 'boolean', 'Invalid English readiness');
  assert.ok(Array.isArray(product.translations), 'Invalid translations envelope');
  const translations = product.translations;
  const seen = new Set();
  for (const row of translations) {
    assert.ok(row && row.locale === 'en' && !seen.has(row.locale), 'Invalid or duplicate translation locale');
    seen.add(row.locale);
    for (const field of ['title', 'shortDescription', 'description', 'categoryName']) assert.ok(typeof row[field] === 'string' && row[field].trim().length, `Invalid English ${field}`);
  }
  if (state.ready) {
    assert.match(state.version, /^[a-f0-9]{64}$/, 'Invalid English content version');
    assert.equal(translations.length, 1, 'English ready content is missing');
  } else {
    assert.equal(state.version, null, 'Unready English content has a version');
    assert.equal(translations.length, 0, 'Unready English content must stay private');
  }
  return { ready: state.ready, version: state.version, title: translations[0]?.title ?? null };
}
async function request(url) {
  return fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
}
export async function readLiveCatalog(api, fetchResponse = request) {
  const items = []; let expected;
  for (let page = 1; ; page++) {
    const r = await fetchResponse(`${api}/api/catalog/products?page=${page}&limit=100`);
    assert.equal(r.status, 200, `Catalog page ${page}: HTTP ${r.status}`);
    const data = await r.json();
    assert.ok(Array.isArray(data.items) && Number.isInteger(data.meta?.total) && data.meta.total >= 0, 'Invalid catalog listing');
    expected ??= data.meta.total;
    assert.equal(data.meta.total, expected, 'Catalog changed during listing; retry');
    assert.equal(data.meta.page, page, 'Wrong API page');
    items.push(...data.items.map(p => ({ slug: p.slug, en: readEnglishState(p) })));
    if (items.length >= expected) break;
    assert.ok(data.items.length, 'Truncated listing');
  }
  assert.equal(items.length, expected, 'Incomplete listing');
  uniqueSlugs(items.map(p => p.slug), 'live');
  return items;
}
export async function readLiveSlugs(api, fetchResponse = request) {
  return (await readLiveCatalog(api, fetchResponse)).map(p => p.slug);
}
function meta(html, name) {
  return html.match(new RegExp(`<meta\\b[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'))?.[1] ?? null;
}
function presentationText(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (match, code) => Number(code) > 0 && Number(code) <= 0x10ffff ? String.fromCodePoint(Number(code)) : match).replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => entities[entity.toLowerCase()]).replace(/\s+/g, ' ').trim();
}
function productData(html, url) {
  for (const [, body] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis)) {
    try { const product = JSON.parse(body); if (product['@type'] === 'Product' && product.url === url) return product; }
    catch { /* Invalid JSON-LD is a failed page check below. */ }
  }
  return null;
}
function alternates(html) {
  return [...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*hrefLang="([^"]+)"[^>]*href="([^"]+)"/gi)].map(([, locale, url]) => ({ locale, url })).sort((a, b) => a.locale.localeCompare(b.locale));
}
export async function verifyFreshness({ site, api }, fetchResponse = request) {
  const live = await readLiveCatalog(api, fetchResponse);
  const sitemapResponse = await fetchResponse(`${site}/sitemap.xml`);
  assert.equal(sitemapResponse.status, 200, `Sitemap: HTTP ${sitemapResponse.status}`);
  const sitemap = await sitemapResponse.text(), origin = new URL(site).origin;
  const diff = compareCatalogSlugs(live.map(p => p.slug), productSlugsFromSitemap(sitemap, origin));
  const enDiff = compareCatalogSlugs(live.filter(p => p.en.ready).map(p => p.slug), productSlugsFromSitemap(sitemap, origin, 'en'));
  const pages = [], queue = live.flatMap(product => ['uk', 'en'].map(locale => ({ ...product, locale })));
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const { slug, en, locale } = queue.shift();
      const ukUrl = `${site}/product/${encodeURIComponent(slug)}/`, enUrl = `${site}/en/product/${encodeURIComponent(slug)}/`;
      const url = locale === 'en' ? enUrl : ukUrl;
      const r = await fetchResponse(url), html = await r.text(), data = productData(html, url);
      const robots = (meta(html, 'robots') || '').split(/\s*,\s*/);
      const expectedAlternates = en.ready ? [{ locale: 'en', url: enUrl }, { locale: 'uk', url: ukUrl }] : [];
      const actualAlternates = alternates(html);
      pages.push({
        slug, locale, status: r.status,
        canonical: html.includes(`<link rel="canonical" href="${url}"`),
        productJsonLd: Boolean(data),
        language: new RegExp(`<html\\b[^>]*lang="${locale}"`).test(html),
        indexing: robots.includes('follow') && (locale === 'en' && !en.ready ? robots.includes('noindex') : robots.includes('index') && !robots.includes('noindex')),
        translationAlternates: JSON.stringify(actualAlternates) === JSON.stringify(expectedAlternates),
        contentVersion: meta(html, 'skufnya-en-content-version') === (en.version || 'untranslated'),
        translatedName: locale !== 'en' || !en.ready || data?.name === presentationText(en.title),
        data,
      });
    }
  }));
  // Locale can change presentation and URLs only; pricing and identity remain equal.
  for (const { slug } of live) {
    const uk = pages.find(p => p.slug === slug && p.locale === 'uk'), en = pages.find(p => p.slug === slug && p.locale === 'en');
    const invariant = data => data && { sku: data.sku, image: data.image, offer: data.offers && Object.fromEntries(Object.entries(data.offers).filter(([key]) => key !== 'url')) };
    uk.commerceSemantics = en.commerceSemantics = !uk.data || !en.data || JSON.stringify(invariant(uk.data)) === JSON.stringify(invariant(en.data));
  }
  const after = await readLiveCatalog(api, fetchResponse);
  const state = items => items.map(p => ({ slug: p.slug, ready: p.en.ready, version: p.en.version, title: p.en.title })).sort((a, b) => a.slug.localeCompare(b.slug));
  assert.deepEqual(state(after), state(live), 'Catalog changed during verification; retry');
  const broken = pages.filter(p => p.status !== 200 || !p.canonical || !p.productJsonLd || !p.language || !p.indexing || !p.translationAlternates || !p.contentVersion || !p.translatedName || !p.commerceSemantics).map(({ data, ...page }) => page);
  return {
    checkedAt: new Date().toISOString(), ...diff,
    enMissing: enDiff.missing, enStale: enDiff.stale,
    checkedPages: pages.length, checkedUkPages: live.length, checkedEnPages: live.length,
    enSeoEligibleProducts: enDiff.liveProducts, enSitemapProducts: enDiff.exportedProducts,
    nonReadyProducts: live.length - enDiff.liveProducts, broken,
    fresh: !diff.missing.length && !diff.stale.length && !enDiff.missing.length && !enDiff.stale.length && !broken.length,
  };
}
async function main() {
  const site = (process.env.STOREFRONT_URL || 'https://www.skufnya.com').replace(/\/$/, '');
  const api = (process.env.NEXT_PUBLIC_API_URL || 'https://api.skufnya.com').replace(/\/$/, '');
  const attempts = Math.max(1, Number(process.env.FRESHNESS_ATTEMPTS || 1));
  let result;
  for (let i = 0; i < attempts; i++) {
    result = await verifyFreshness({ site, api });
    if (result.fresh || i === attempts - 1) break;
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  console.log(JSON.stringify(result, null, 2));
  if (process.env.FRESHNESS_OUTPUT) fs.writeFileSync(process.env.FRESHNESS_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_build=${!result.fresh}\n`);
  if (!result.fresh) {
    console.error('::warning::Live public catalog or English editorial content differs from published Pages. Rebuild and verify; snapshot consistency alone cannot ensure freshness.');
    if (!process.argv.includes('--reconcile')) process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

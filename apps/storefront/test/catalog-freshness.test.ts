import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareCatalogSlugs, productSlugsFromSitemap, readLiveSlugs, verifyFreshness } from '../scripts/catalog-freshness.mjs';

test('freshness detects a public product absent from a consistent older snapshot', () => {
  const old = Array.from({ length: 165 }, (_, i) => `p-${i}`);
  const result = compareCatalogSlugs([...old, 'frieren'], old);
  assert.equal(result.liveProducts, 166); assert.equal(result.exportedProducts, 165);
  assert.deepEqual(result.missing, ['frieren']);
});
test('freshness compares identities even when counts match', () => {
  const result = compareCatalogSlugs(['frieren'], ['old-slug']);
  assert.deepEqual(result.missing, ['frieren']); assert.deepEqual(result.stale, ['old-slug']);
});
test('freshness accepts equal sets in any order and rejects duplicates', () => {
  assert.deepEqual(compareCatalogSlugs(['b', 'a'], ['a', 'b']).missing, []);
  assert.throws(() => compareCatalogSlugs(['a', 'a'], ['a']));
  assert.throws(() => compareCatalogSlugs(['a'], ['a', 'a']));
});
test('freshness requires canonical sitemap origin and product trailing slash', () => {
  const xml = (u: string) => `<urlset><url><loc>${u}</loc></url></urlset>`;
  assert.deepEqual(productSlugsFromSitemap(xml('https://www.skufnya.com/product/frieren/'), 'https://www.skufnya.com'), ['frieren']);
  assert.throws(() => productSlugsFromSitemap(xml('https://wrong.test/product/frieren/'), 'https://www.skufnya.com'));
  assert.throws(() => productSlugsFromSitemap(xml('https://www.skufnya.com/product/frieren'), 'https://www.skufnya.com'));
});
test('freshness fails closed on incomplete, changing or unavailable live listings', async () => {
  for (const body of [{ items: [], meta: { page: 1, total: 2 } }, { items: [{ slug: 'a' }], meta: { page: 1, total: 0 } }]) {
    await assert.rejects(readLiveSlugs('https://api.test', async () => new Response(JSON.stringify(body))));
  }
  await assert.rejects(readLiveSlugs('https://api.test', async () => new Response('', { status: 503 })));
  await assert.rejects(readLiveSlugs('https://api.test', async (url: string) => new Response(JSON.stringify({ items: [{ slug: url.includes('page=1') ? 'a' : 'b' }], meta: { page: url.includes('page=1') ? 1 : 2, total: url.includes('page=1') ? 2 : 3 } }))));
});
test('freshness checks page availability even when sitemap matches, including soft 404', async () => {
  for (const status of [200, 404]) {
    const result = await verifyFreshness({ site: 'https://site.test', api: 'https://api.test' }, async (url: string) => {
      if (url.includes('/api/catalog/')) return new Response(JSON.stringify({ items: [{ slug: 'frieren' }], meta: { page: 1, total: 1 } }));
      if (url.endsWith('sitemap.xml')) return new Response('<urlset><url><loc>https://site.test/product/frieren/</loc></url></urlset>');
      return new Response('<h1>Not found</h1>', { status });
    });
    assert.equal(result.fresh, false); assert.equal(result.broken.length, 2);
  }
});
test('freshness accepts matching live URLs only after checking real product HTML', async () => {
  const result = await verifyFreshness({ site: 'https://site.test', api: 'https://api.test' }, async (url: string) => {
    if (url.includes('/api/catalog/')) return new Response(JSON.stringify({ items: [{ slug: 'frieren' }], meta: { page: 1, total: 1 } }));
    if (url.endsWith('sitemap.xml')) return new Response('<urlset><url><loc>https://site.test/product/frieren/</loc></url></urlset>');
    return new Response(productHtml(url));
  });
  assert.equal(result.fresh, true); assert.equal(result.checkedPages, 2);
  assert.equal(result.checkedUkPages, 1); assert.equal(result.checkedEnPages, 1); assert.equal(result.enSeoEligibleProducts, 0);
});
test('freshness does not give a green result if the live catalog changes during page checks', async () => {
  let listings = 0;
  await assert.rejects(verifyFreshness({ site: 'https://site.test', api: 'https://api.test' }, async (url: string) => {
    if (url.includes('/api/catalog/')) return new Response(JSON.stringify({ items: [{ slug: ++listings === 1 ? 'frieren' : 'new-product' }], meta: { page: 1, total: 1 } }));
    if (url.endsWith('sitemap.xml')) return new Response('<urlset><url><loc>https://site.test/product/frieren/</loc></url></urlset>');
    return new Response(productHtml(url));
  }), /Catalog changed during verification/);
});

function productHtml(url: string) {
  const locale = new URL(url).pathname.startsWith('/en/') ? 'en' : 'uk';
  return `<html lang="${locale}"><head><link rel="canonical" href="${url}"><meta name="robots" content="${locale === 'en' ? 'noindex' : 'index'}, follow"><script type="application/ld+json">${JSON.stringify({ '@type': 'Product', url })}</script></head></html>`;
}

function fixtureFetch(transform: (html: string, url: string) => string = html => html, enStatus = 200) {
  return async (url: string) => {
    if (url.includes('/api/catalog/')) return new Response(JSON.stringify({ items: [{ slug: 'frieren' }], meta: { page: 1, total: 1 } }));
    if (url.endsWith('sitemap.xml')) return new Response('<urlset><url><loc>https://site.test/product/frieren/</loc></url></urlset>');
    return new Response(transform(productHtml(url), url), { status: url.includes('/en/') ? enStatus : 200 });
  };
}

test('Stage 2A freshness rejects missing EN routes even when UK sitemap and pages are fresh', async () => {
  const result = await verifyFreshness({ site: 'https://site.test', api: 'https://api.test' }, fixtureFetch(undefined, 404));
  assert.equal(result.fresh, false);
  assert.equal(result.broken.length, 1);
  assert.equal(result.broken[0].locale, 'en');
});

test('Stage 2A freshness rejects wrong EN language, canonical, indexing and translation alternates', async () => {
  const changes = [
    (html: string) => html.replace('lang="en"', 'lang="uk"'),
    (html: string) => html.replace('href="https://site.test/en/product/', 'href="https://site.test/product/'),
    (html: string) => html.replace('content="noindex', 'content="index'),
    (html: string) => html.replace('</head>', '<link rel="alternate" hrefLang="en" href="https://site.test/en/product/frieren/"/></head>'),
  ];
  for (const change of changes) {
    const result = await verifyFreshness({ site: 'https://site.test', api: 'https://api.test' }, fixtureFetch((html, url) => url.includes('/en/') ? change(html) : html));
    assert.equal(result.fresh, false); assert.equal(result.broken.length, 1); assert.equal(result.broken[0].locale, 'en');
  }
});

test('Stage 2A sitemap excludes untranslated EN product routes and unpublished locale prefixes', () => {
  for (const path of ['/en/product/frieren/', '/de/catalog/', '/uk/catalog/']) {
    assert.throws(() => productSlugsFromSitemap(`<urlset><url><loc>https://site.test${path}</loc></url></urlset>`, 'https://site.test'));
  }
});

test('freshness requires actual Product JSON-LD matching the locale URL', async () => {
  for (const change of [
    (html: string) => html.replace('application/ld+json', 'text/plain'),
    (html: string) => html.replace('"url":"https://site.test/en/product/', '"url":"https://site.test/product/'),
  ]) {
    const result = await verifyFreshness({ site: 'https://site.test', api: 'https://api.test' }, fixtureFetch((html, url) => url.includes('/en/') ? change(html) : html));
    assert.equal(result.fresh, false); assert.equal(result.broken.length, 1);
  }
});

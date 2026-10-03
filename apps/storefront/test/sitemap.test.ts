import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sitemapUrls, STATIC_SITEMAP_PATHS } from '../src/lib/sitemap-urls.ts';
import { validateCatalogSnapshot } from '../src/lib/snapshot-integrity.ts';
import { buildProductUrl } from '../src/lib/product-meta.ts';
import { PUBLISHED_LOCALES } from '../src/i18n/locales.ts';

describe('snapshot sitemap', () => {
  it('adds only EN SEO-ready products without dropping any UK public product', () => {
    const urls = sitemapUrls(['translated', 'fallback'], ['translated']);
    assert.ok(urls.includes(buildProductUrl('translated')));
    assert.ok(urls.includes(buildProductUrl('fallback')));
    assert.ok(urls.includes(buildProductUrl('translated', 'en')));
    assert.equal(urls.includes(buildProductUrl('fallback', 'en')), false);
    assert.equal(urls.length, STATIC_SITEMAP_PATHS.length * PUBLISHED_LOCALES.length + 3);
    assert.throws(() => sitemapUrls(['translated'], ['unpublished']));
    assert.throws(() => sitemapUrls(['translated'], ['translated', 'translated']));
  });
  it('includes every snapshot slug and all existing static URLs with canonical trailing slashes', () => {
    const snapshot = { count: 3, items: ['figure-one', 'figure-two', 'фігурка'].map((slug) => ({ id: slug, title: slug, slug, status: 'ACTIVE', images: [], variants: [] })) };
    assert.deepEqual(validateCatalogSnapshot(snapshot), []);
    const urls = sitemapUrls(snapshot.items.map((item) => item.slug));
    assert.equal(urls.length, snapshot.count + STATIC_SITEMAP_PATHS.length * PUBLISHED_LOCALES.length);
    for (const item of snapshot.items) assert.ok(urls.includes(buildProductUrl(item.slug)));
    for (const path of STATIC_SITEMAP_PATHS) {
      assert.ok(urls.includes(`https://www.skufnya.com${path}`));
      assert.ok(urls.includes(`https://www.skufnya.com/en${path}`));
    }
    for (const url of urls) { assert.equal(new URL(url).origin, 'https://www.skufnya.com'); assert.ok(url.endsWith('/')); }
    // Product pages exist under /en/ but are not indexed, so only their Ukrainian URL is submitted.
    for (const item of snapshot.items) assert.equal(urls.includes(buildProductUrl(item.slug, 'en')), false);
    assert.equal(urls.filter((url) => new URL(url).pathname.startsWith('/en/')).length, STATIC_SITEMAP_PATHS.length);
  });
  it('stops export if a draft or archived product leaks into the build snapshot', () => {
    for (const status of ['DRAFT', 'ARCHIVED']) {
      assert.ok(validateCatalogSnapshot({ count: 1, items: [{ id: 'a', slug: 'a', title: 'A', status, images: [], variants: [] }] }).some((issue) => issue.includes('not ACTIVE')));
    }
  });
});

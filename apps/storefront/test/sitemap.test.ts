import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sitemapUrls, STATIC_SITEMAP_PATHS } from '../src/lib/sitemap-urls.ts';
import { validateCatalogSnapshot } from '../src/lib/snapshot-integrity.ts';
import { buildProductUrl } from '../src/lib/product-meta.ts';

describe('snapshot sitemap', () => {
  it('includes every snapshot slug and all existing static URLs with canonical trailing slashes', () => {
    const snapshot = { count: 3, items: ['figure-one', 'figure-two', 'фігурка'].map((slug) => ({ id: slug, title: slug, slug, status: 'ACTIVE', images: [], variants: [] })) };
    assert.deepEqual(validateCatalogSnapshot(snapshot), []);
    const urls = sitemapUrls(snapshot.items.map((item) => item.slug));
    assert.equal(urls.length, snapshot.count + 8);
    for (const item of snapshot.items) assert.ok(urls.includes(buildProductUrl(item.slug)));
    for (const path of STATIC_SITEMAP_PATHS) assert.ok(urls.includes(`https://www.skufnya.com${path}`));
    for (const url of urls) { assert.equal(new URL(url).origin, 'https://www.skufnya.com'); assert.ok(url.endsWith('/')); assert.equal(url.includes('/en/'), false); }
  });
  it('stops export if a draft or archived product leaks into the build snapshot', () => {
    for (const status of ['DRAFT', 'ARCHIVED']) {
      assert.ok(validateCatalogSnapshot({ count: 1, items: [{ id: 'a', slug: 'a', title: 'A', status, images: [], variants: [] }] }).some((issue) => issue.includes('not ACTIVE')));
    }
  });
});

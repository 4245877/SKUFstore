import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalogProductDetail, normalizeResinColors } from '../src/lib/api.ts';
import { buildMerchantSourceState, buildMerchantFeed } from '../src/lib/merchant-feed.ts';
import { readLiveMerchantData, verifyMerchantFreshness } from '../scripts/merchant-freshness.mjs';

const api = 'https://api.test';
const site = 'https://site.test';
const product = () => ({
  id: 'product-1', slug: 'figure', title: 'Колекційна фігурка', sku: 'FIGURE',
  status: 'ACTIVE', saleType: 'IN_STOCK', isAdult: false, currency: 'UAH',
  description: 'Фігурка зі смоли', shortDescription: null, priceFrom: 1000,
  images: [{ id: 'photo-1', url: '/uploads/figure.webp', isCover: true }],
  variants: [{ id: 'variant-1', name: 'Default', sku: 'FIGURE-1', currency: 'UAH',
    price: 1000, stockQty: 0, reservedQty: 0, isDefault: true, isActive: true, images: [] }],
});
const colors = () => [{ id: 'ivory', slug: 'ivory', name: 'Айворі', hexColor: '#F4EBDD', priceDelta: 0, isInStock: true, sortOrder: 0 }];
const state = (products = [product()], resin = colors()) =>
  buildMerchantSourceState(products.map(normalizeCatalogProductDetail), normalizeResinColors({ items: resin }));

function fixture(options: {
  products?: any[]; colors?: any[]; published?: any; publishedStatus?: number;
  exportBody?: any; totalBody?: any; colorsBody?: any;
  response?: (url: string) => Response | undefined;
} = {}) {
  const products = options.products ?? [product()];
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    const override = options.response?.(url);
    if (override) return override;
    if (url === `${api}/api/catalog/products/export`) return Response.json(options.exportBody ?? { count: products.length, items: products });
    if (url === `${api}/api/catalog/products?page=1&limit=1`) return Response.json(options.totalBody ?? { items: products.slice(0, 1).map(({ id, slug }) => ({ id, slug })), meta: { page: 1, total: products.length } });
    if (url === `${api}/api/catalog/resin-colors`) return Response.json(options.colorsBody ?? { items: options.colors ?? colors() });
    if (url === `${site}/google-merchant.xml`) return new Response(buildMerchantFeed([product()].map(normalizeCatalogProductDetail), colors(), () => null).xml);
    if (url === `${site}/google-merchant-state.json`) return new Response(JSON.stringify(options.published ?? state()), { status: options.publishedStatus ?? 200 });
    throw new Error(`Unexpected request: ${url}`);
  };
  return { fetcher, requested };
}

test('Merchant freshness accepts the same normalized catalog and uses only public bulk endpoints', async () => {
  const raw = product();
  raw.variants[0].price = '1000' as any;
  const { fetcher, requested } = fixture({ products: [raw] });
  const result = await verifyMerchantFreshness({ site, api }, fetcher);
  assert.equal(result.fresh, true);
  assert.equal(result.liveProducts, 1);
  assert.equal(result.publishedStateMissing, false);
  assert.deepEqual(new Set(requested), new Set([
    `${api}/api/catalog/products/export`, `${api}/api/catalog/products?page=1&limit=1`,
    `${api}/api/catalog/resin-colors`, `${site}/google-merchant-state.json`, `${site}/google-merchant.xml`,
  ]));
});

test('unchanged slugs still rebuild for price, descriptions, availability and variant changes', async () => {
  const changes: Array<(value: ReturnType<typeof product>) => void> = [
    value => { value.variants[0].price = 1200; },
    value => { value.description = 'Новий опис'; },
    value => { value.title = 'Інша назва'; },
    value => { value.saleType = 'PREORDER'; },
    value => { value.variants[0].isActive = false; },
    value => { value.variants[0].name = 'Інший варіант'; },
    value => { value.variants[0].stockQty = 2; },
    value => { value.variants[0].reservedQty = 1; },
    value => { value.variants.push({ ...value.variants[0], id: 'variant-2', isDefault: false }); },
    value => { value.images[0].url = '/uploads/new-photo.webp'; },
  ];
  for (const change of changes) {
    const changed = product(); change(changed);
    const result = await verifyMerchantFreshness({ site, api }, fixture({ products: [changed] }).fetcher);
    assert.equal(result.fresh, false);
    assert.equal(result.liveProducts, result.publishedProducts);
  }
});

test('resin price and stock changes rebuild while normalization preserves sorted defaults', async () => {
  for (const change of [(value: any) => { value.priceDelta = 200; }, (value: any) => { value.isInStock = false; }]) {
    const changed = colors(); change(changed[0]);
    assert.equal((await verifyMerchantFreshness({ site, api }, fixture({ colors: changed }).fetcher)).fresh, false);
  }
  const ivory = colors()[0];
  const graphite = { ...ivory, id: 'graphite', slug: 'graphite', name: 'Графіт', sortOrder: 1 };
  const result = await verifyMerchantFreshness({ site, api }, fixture({
    colors: [graphite, ivory], published: state([product()], [ivory, graphite]),
  }).fetcher);
  assert.equal(result.fresh, true);
});

test('a missing initial published state requests a build, but an API outage still fails', async () => {
  const result = await verifyMerchantFreshness({ site, api }, fixture({ publishedStatus: 404 }).fetcher);
  assert.equal(result.fresh, false); assert.equal(result.publishedStateMissing, true);
  assert.equal(result.publishedProducts, null);
  await assert.rejects(verifyMerchantFreshness({ site, api }, fixture({
    publishedStatus: 404, response: url => url.endsWith('/export') ? new Response('', { status: 503 }) : undefined,
  }).fetcher), /HTTP 503/);
});

test('truncated exports, wrong totals and duplicate identities fail instead of producing a partial state', async () => {
  const cases = [
    { exportBody: { count: 2, items: [product()] } },
    { totalBody: { items: [{ id: 'product-1', slug: 'figure' }], meta: { page: 1, total: 2 } } },
    { totalBody: { items: [], meta: { page: 1, total: 1 } } },
    { totalBody: { items: [product()], meta: { page: 2, total: 1 } } },
    { totalBody: { items: [{ id: 'another-id', slug: 'figure' }], meta: { page: 1, total: 1 } } },
    { totalBody: { items: [{}], meta: { page: 1, total: 1 } } },
    { products: [product(), product()] },
    { products: [product(), { ...product(), id: 'product-2' }] },
    { products: [{ ...product(), id: '' }] },
    { products: [{ ...product(), variants: [product().variants[0], product().variants[0]] }] },
    { colors: [colors()[0], colors()[0]] },
  ];
  for (const options of cases) await assert.rejects(readLiveMerchantData(api, fixture(options).fetcher));
});

test('malformed API data cannot be silently normalized into empty arrays or zero prices', async () => {
  const cases = [
    { exportBody: { error: 'unavailable' } },
    { exportBody: { count: '1', items: [product()] } },
    { totalBody: { items: [], meta: { page: 1, total: '1' } } },
    { products: [{ ...product(), variants: null }] },
    { products: [{ ...product(), attributes: [] }] },
    { products: [{ ...product(), attributes: { merchant: { enabled: 'false' } } }] },
    { products: [{ ...product(), attributes: { merchant: { content: 'UNKNOWN' } } }] },
    { products: [{ ...product(), attributes: { merchant: { additionalImageStorageKeys: 'wrong' } } }] },
    { products: [{ ...product(), variants: [{ ...product().variants[0], price: 'unknown' }] }] },
    { products: [{ ...product(), images: ['invalid'] }] },
    { colorsBody: { error: 'unavailable' } },
    { colors: [null] },
    { colors: [{ ...colors()[0], slug: '' }] },
    { colors: [{ ...colors()[0], isInStock: 'false' }] },
  ];
  for (const options of cases) await assert.rejects(readLiveMerchantData(api, fixture(options).fetcher));
  assert.equal((await verifyMerchantFreshness({ site, api }, fixture({ products: [] }).fetcher)).liveProducts, 0);
});

test('HTTP, network, invalid JSON and corrupt published states fail the check', async () => {
  for (const endpoint of ['/api/catalog/products/export', '/api/catalog/products?page=1&limit=1', '/api/catalog/resin-colors', '/google-merchant-state.json', '/google-merchant.xml']) {
    await assert.rejects(verifyMerchantFreshness({ site, api }, fixture({ response: url => url.endsWith(endpoint) ? new Response('', { status: 503 }) : undefined }).fetcher), /HTTP 503/);
    if (endpoint.endsWith('.xml')) assert.equal((await verifyMerchantFreshness({ site, api }, fixture({ response: url => url.endsWith(endpoint) ? new Response('{broken') : undefined }).fetcher)).fresh, false);
    else await assert.rejects(verifyMerchantFreshness({ site, api }, fixture({ response: url => url.endsWith(endpoint) ? new Response('{broken') : undefined }).fetcher));
  }
  await assert.rejects(verifyMerchantFreshness({ site, api }, async () => { throw new Error('network offline'); }), /network offline/);
  for (const published of [{}, { ...state(), version: 3 }, { ...state(), fingerprint: 'invalid' }, { ...state(), productCount: '1' }]) {
    await assert.rejects(verifyMerchantFreshness({ site, api }, fixture({ published }).fetcher));
  }
});


test('published XML is verified even when its state is fresh; missing/altered XML forces a rebuild', async () => {
  for (const response of [new Response('', { status: 404 }), new Response('<rss>stale</rss>')]) {
    const result = await verifyMerchantFreshness({ site, api }, fixture({ response: url => url.endsWith('.xml') ? response : undefined }).fetcher);
    assert.equal(result.fresh, false); assert.equal(result.xmlMatches, false);
  }
  assert.equal((await verifyMerchantFreshness({ site, api }, fixture({ published: { ...state(), version: 1 } }).fetcher)).fresh, false);
});

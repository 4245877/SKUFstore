import assert from 'node:assert/strict';
import { normalizeCatalogProductDetail, normalizeResinColors } from './api.ts';

function record(value: any, label: string) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  return value;
}
function string(value: any, label: string) {
  assert.ok(typeof value === 'string' && value.trim().length > 0, `${label}: expected nonempty string`);
}
function numeric(value: any, label: string) {
  assert.ok((typeof value === 'number' || typeof value === 'string' && value.trim().length > 0) && Number.isFinite(Number(value)), `${label}: expected finite number`);
}
function unique(values: any[], label: string) {
  for (const value of values) string(value, label);
  assert.equal(new Set(values).size, values.length, `${label}: duplicates`);
}
function images(values: any, label: string) {
  assert.ok(Array.isArray(values), `${label}: expected images array`);
  for (const image of values) {
    record(image, label);
    string(image.url, `${label} URL`);
  }
}
function productDetails(items: Array<Record<string, any>>) {
  unique(items.map(p => record(p, 'Product').id), 'Product IDs');
  unique(items.map(p => p.slug), 'Product slugs');
  const variantIds: string[] = [];
  for (const product of items) {
    assert.ok(!/[/?#\\]/.test(product.slug) && !['.', '..'].includes(product.slug), 'Product: invalid slug');
    for (const field of ['title', 'sku', 'status', 'saleType', 'currency']) string(product[field], `Product ${field}`);
    for (const field of ['description', 'shortDescription']) assert.ok(product[field] === null || typeof product[field] === 'string', `Product ${field}: expected text or null`);
    if (product.attributes != null) {
      record(product.attributes, 'Product attributes');
      const merchant = product.attributes.merchant;
      if (merchant !== undefined) {
        record(merchant, 'Merchant settings');
        if (merchant.enabled !== undefined) assert.equal(typeof merchant.enabled, 'boolean', 'Merchant enabled: expected boolean');
        for (const [key, values] of Object.entries({ content: ['UNREVIEWED', 'GENERAL', 'ADULT'], identifierPolicy: ['UNREVIEWED', 'NONE', 'ASSIGNED'] })) {
          if (merchant[key] !== undefined) assert.ok(values.includes(merchant[key]), `Invalid Merchant ${key}`);
        }
        for (const key of ['defaultColorSlug', 'imageVariantId', 'imageStorageKey', 'manufacturerBrand', 'mpn', 'gtin', 'googleProductCategory', 'availabilityDate']) {
          if (merchant[key] !== undefined) assert.equal(typeof merchant[key], 'string', `Merchant ${key}: expected text`);
        }
        if (merchant.additionalImageStorageKeys !== undefined) {
          assert.ok(Array.isArray(merchant.additionalImageStorageKeys) && merchant.additionalImageStorageKeys.length <= 10, 'Invalid Merchant additional images');
          for (const key of merchant.additionalImageStorageKeys) string(key, 'Merchant additional image key');
        }
      }
    }
    numeric(product.priceFrom, 'Product priceFrom');
    assert.equal(typeof product.isAdult, 'boolean', 'Product isAdult: expected boolean');
    images(product.images, 'Product images');
    assert.ok(Array.isArray(product.variants), 'Product: expected variants array');
    for (const variant of product.variants) {
      record(variant, 'Variant');
      for (const field of ['id', 'name', 'sku', 'currency']) string(variant[field], `Variant ${field}`);
      variantIds.push(variant.id);
      for (const field of ['price', 'stockQty', 'reservedQty']) numeric(variant[field], `Variant ${field}`);
      for (const field of ['isDefault', 'isActive']) assert.equal(typeof variant[field], 'boolean', `Variant ${field}: expected boolean`);
      images(variant.images, 'Variant images');
    }
  }
  unique(variantIds, 'Variant IDs');
}
function resinColors(data: any) {
  record(data, 'Resin colors');
  assert.ok(Array.isArray(data.items), 'Resin colors: expected items array');
  unique(data.items.map((color: any) => record(color, 'Resin color').id), 'Resin color IDs');
  unique(data.items.map((color: any) => color.slug), 'Resin color slugs');
  for (const color of data.items) {
    for (const field of ['name', 'hexColor']) string(color[field], `Resin color ${field}`);
    for (const field of ['priceDelta', 'sortOrder']) numeric(color[field], `Resin color ${field}`);
    assert.equal(typeof color.isInStock, 'boolean', 'Resin color isInStock: expected boolean');
  }
  const normalized = normalizeResinColors(data);
  assert.equal(normalized.length, data.items.length, 'Resin colors were lost during normalization');
  return normalized;
}
async function request(url: string) {
  return fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
}
async function jsonResponse(response: Response, label: string) {
  assert.equal(response.status, 200, `${label}: HTTP ${response.status}`);
  return record(await response.json(), label);
}

export async function readLiveMerchantData(api: string, fetchResponse: (url: string) => Promise<Response> = request) {
  const [exportResponse, totalResponse, colorsResponse] = await Promise.all([
    fetchResponse(`${api}/api/catalog/products/export`),
    fetchResponse(`${api}/api/catalog/products?page=1&limit=1`),
    fetchResponse(`${api}/api/catalog/resin-colors`),
  ]);
  const [data, listing, colorData] = await Promise.all([
    jsonResponse(exportResponse, 'Merchant catalog export'),
    jsonResponse(totalResponse, 'Catalog total'),
    jsonResponse(colorsResponse, 'Resin colors'),
  ]);
  assert.ok(Array.isArray(data.items) && Number.isInteger(data.count) && data.count >= 0, 'Invalid Merchant catalog export');
  assert.equal(data.count, data.items.length, 'Merchant export count does not match items');
  assert.ok(Array.isArray(listing.items) && Number.isInteger(listing.meta?.total) && listing.meta.total >= 0, 'Invalid catalog total');
  assert.equal(listing.meta.page, 1, 'Wrong catalog total page');
  assert.equal(listing.items.length, Math.min(listing.meta.total, 1), 'Incomplete catalog total page');
  assert.equal(data.count, listing.meta.total, 'Merchant export is incomplete or catalog changed; retry');
  if (data.publishedCount !== undefined) assert.equal(data.publishedCount, data.count, 'Incomplete atomic catalog export');
  productDetails(data.items);
  for (const item of listing.items) {
    record(item, 'Catalog total item');
    string(item.id, 'Catalog total product ID');
    string(item.slug, 'Catalog total product slug');
    assert.ok(data.items.some((product: any) => product.id === item.id && product.slug === item.slug), 'Catalog listing identity is missing from Merchant export');
  }
  return {
    rawProducts: data.items as Array<Record<string, any>>,
    products: data.items.map(normalizeCatalogProductDetail),
    colors: data.resinColors !== undefined ? resinColors({ items: data.resinColors }) : resinColors(colorData),
  };
}


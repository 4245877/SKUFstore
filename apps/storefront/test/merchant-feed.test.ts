import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import type { CatalogProductDetail, CatalogResinColor } from '../src/lib/api';
import { buildMerchantFeed, buildMerchantSourceState, sanitizeXml } from '../src/lib/merchant-feed.ts';
import { buildProductGalleryImages, resolveDefaultProductOffer } from '../src/lib/product-offer.ts';

const colors: CatalogResinColor[] = [
  { id: 'ivory', name: 'Айворі', slug: 'ivory', hexColor: '#ffffff', priceDelta: 0, isInStock: false, sortOrder: 0 },
  { id: 'black', name: 'Чорний', slug: 'black', hexColor: '#000000', priceDelta: 100, isInStock: true, sortOrder: 1 },
];
const photo = { id: 'image', url: '/uploads/mono-black.webp', alt: 'Black mono', storageKey: 'catalog/mono-black.webp', isCover: true };
const variant = { id: 'v1', name: 'Large', sku: 'SKU-1', sizeLabel: '30 cm', outfitLabel: null, faceLabel: null,
  resinGrams: 100, price: 3130, currency: 'UAH', stockQty: 0, reservedQty: 0, isDefault: true, isActive: true, images: [photo] };
function product(overrides: Partial<CatalogProductDetail> = {}): CatalogProductDetail {
  return { id: 'product-1', slug: 'фігурка-black', title: 'Фігурка <b>A &amp; B</b>', sku: 'SKU-1', status: 'ACTIVE',
    description: 'Колекційна фігурка <strong>3D</strong> &amp; підставка.', shortDescription: null,
    isAdult: false, saleType: 'IN_STOCK', ageRating: 'ALL', priceFrom: 1000, currency: 'UAH',
    pricing: { priceFrom: 1000, priceTo: 3130, activeVariantCount: 2, hasPriceRange: true },
    images: [photo], coverImage: photo, variants: [variant], attributes: { merchant: { defaultColorSlug: 'black', imageVariantId: 'v1', imageStorageKey: 'catalog/mono-black.webp', identifierPolicy: 'NONE' } }, ...overrides };
}
const resolveImage = (path?: string | null) => path ? `https://api.skufnya.com${path}` : null;

// Python's standard XML parser verifies namespaces, escaping and well-formedness
// independently of the feed renderer, without another production dependency.
function parseItems(xml: string): Array<Record<string, string>> {
  const parsed = spawnSync('python3', ['-c',
    'import sys,json,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); print(json.dumps([{c.tag.removeprefix("{http://base.google.com/ns/1.0}"):c.text for c in i} for i in r.findall("./channel/item")]))'],
  { input: xml, encoding: 'utf8' });
  assert.equal(parsed.status, 0, parsed.stderr);
  return JSON.parse(parsed.stdout);
}

describe('Merchant feed and visible default configuration', () => {
  it('exports the actual default variant plus in-stock color surcharge, not priceFrom or the cheapest variant', () => {
    const p = product({ variants: [{ ...variant, id: 'cheap', price: 1000, isDefault: false }, variant] });
    const result = buildMerchantFeed([p], colors, resolveImage);
    const [item] = parseItems(result.xml);
    assert.equal(item.id, 'product-1');
    assert.equal(item.price, '3230.00 UAH');
    assert.equal(item.availability, 'in_stock');
    assert.equal(item.condition, 'new');
    assert.ok(item.title.startsWith('Фігурка A & B — Large'));
    assert.ok(item.title.includes('Монохромна версія'));
    assert.ok(item.description.endsWith('Колекційна фігурка 3D & підставка.'));
    assert.equal(item.link, 'https://www.skufnya.com/product/%D1%84%D1%96%D0%B3%D1%83%D1%80%D0%BA%D0%B0-black/');
    assert.equal(item.image_link, 'https://api.skufnya.com/uploads/mono-black.webp');
    assert.equal(item.identifier_exists, 'no');
    assert.equal(item.gtin, undefined);
    assert.equal(item.mpn, undefined);
    assert.equal(item.brand, undefined);
    assert.deepEqual(result.diagnostics, { productCount: 1, includedCount: 1, excluded: [] });
    assert.equal(resolveDefaultProductOffer(p, colors).offer?.price, 3230);
  });

  it('uses the first variant when no default flag exists and does not silently replace an inactive default', () => {
    assert.equal(resolveDefaultProductOffer(product({ variants: [{ ...variant, isDefault: false, price: 2000 }] }), colors).offer?.price, 2100);
    assert.equal(resolveDefaultProductOffer(product({ variants: [{ ...variant, isActive: false },
      { ...variant, id: 'active', isDefault: false }] }), colors).reason, 'unavailable_default_configuration');
  });

  it('matches the gallery MONO/color image ahead of a painted cover', () => {
    const painted = { ...photo, id: 'painted', storageKey: 'catalog/painted.webp', url: '/uploads/painted.webp', alt: 'Painted', isCover: true };
    const mono = { ...photo, isCover: false };
    const p = product({ images: [painted, mono], coverImage: painted, variants: [{ ...variant, images: [painted] }] });
    assert.equal(buildProductGalleryImages(p.images, p.variants[0], 'MONO', colors[1])[0].id, 'image');
    assert.equal(parseItems(buildMerchantFeed([p], colors, resolveImage).xml)[0].image_link,
      'https://api.skufnya.com/uploads/mono-black.webp');
  });

  it('keeps the same ID through price/title/slug edits and uses supplied manufacturer identifiers only', () => {
    const [item] = parseItems(buildMerchantFeed([product({ slug: 'changed', title: 'Changed',
      attributes: { merchant: { defaultColorSlug: 'black', imageVariantId: 'v1', imageStorageKey: 'catalog/mono-black.webp', identifierPolicy: 'ASSIGNED' } }, gtin: '4006381333931', mpn: 'MODEL-01', manufacturerBrand: 'SKUFnya',
      brand: { name: 'Anime franchise' }, franchise: { name: 'Anime franchise' } })], colors, resolveImage).xml);
    assert.equal(item.id, 'product-1');
    assert.equal(item.identifier_exists, 'yes');
    assert.equal(item.gtin, '4006381333931');
    assert.equal(item.mpn, 'MODEL-01');
    assert.equal(item.brand, 'SKUFnya');
    const withoutGtin = parseItems(buildMerchantFeed([product({ attributes: { merchant: { defaultColorSlug: 'black', imageVariantId: 'v1', imageStorageKey: 'catalog/mono-black.webp', identifierPolicy: 'ASSIGNED' } }, manufacturerBrand: 'SKUFnya', mpn: 'MODEL-01' })], colors, resolveImage).xml)[0];
    assert.equal(withoutGtin.identifier_exists, 'yes');
  });
});

describe('Merchant feed exclusions and collection integrity', () => {
  it('reports each excluded product rather than publishing fake data or an adult fallback image', () => {
    const rejected = [
      product({ id: 'adult', slug: 'adult', isAdult: true }),
      product({ id: 'pre', slug: 'pre', saleType: 'PREORDER' }),
      product({ id: 'back', slug: 'back', saleType: 'BACKORDER' }),
      product({ id: 'no-image', slug: 'no-image', images: [], variants: [{ ...variant, images: [] }] }),
      product({ id: 'no-price', slug: 'no-price', variants: [{ ...variant, price: NaN }] }),
      product({ id: 'bad-currency', slug: 'bad-currency', currency: 'USD' }),
      product({ id: 'no-description', slug: 'no-description', description: null }),
      product({ id: 'bad-gtin', slug: 'bad-gtin', gtin: '4006381333932' }),
      product({ id: 'numeric-gtin', slug: 'numeric-gtin', gtin: 4006381333931 }),
      product({ id: 'adult-rating', slug: 'adult-rating', ageRating: 'ADULT' }),
      product({ id: 'incomplete-mpn', slug: 'incomplete-mpn', mpn: 'MODEL-1' }),
    ];
    const result = buildMerchantFeed([product(), ...rejected], colors, resolveImage);
    assert.equal(parseItems(result.xml).length, 1);
    assert.deepEqual(Object.fromEntries(result.diagnostics.excluded.map(item => [item.id, item.reason])), {
      adult: 'adult_content_review_required', pre: 'missing_availability_date', back: 'missing_availability_date',
      'no-image': 'unverified_configuration_image', 'no-price': 'invalid_price', 'bad-currency': 'unsupported_currency',
      'no-description': 'missing_description', 'bad-gtin': 'invalid_gtin', 'numeric-gtin': 'invalid_gtin',
      'adult-rating': 'adult_content_review_required', 'incomplete-mpn': 'incomplete_product_identifiers',
    });
  });

  it('requires a real dated availability for preorders/backorders', () => {
    const date = '2027-01-15T12:00:00+02:00';
    for (const saleType of ['PREORDER', 'BACKORDER']) {
      const item = parseItems(buildMerchantFeed([product({ saleType, availabilityDate: date })], colors, resolveImage).xml)[0];
      assert.equal(item.availability, saleType.toLowerCase());
      assert.equal(item.availability_date, date);
    }
    for (const availabilityDate of ['soon', '2027-01-15', '2027-01-15T12:00:00', '2027-02-30T12:00:00Z', '2027-01-15T24:00:00Z', null]) {
      assert.equal(resolveDefaultProductOffer(product({ saleType: 'PREORDER', availabilityDate }), colors).reason,
        'missing_availability_date');
    }
  });

  it('refuses empty/broken/duplicate collections and exposes diagnostics when every item is excluded', () => {
    assert.equal(parseItems(buildMerchantFeed([], colors, resolveImage).xml).length, 0);
    assert.throws(() => buildMerchantFeed([product({ id: '' })], colors, resolveImage), /malformed product/);
    assert.throws(() => buildMerchantFeed([product(), product()], colors, resolveImage), /Duplicate Merchant product/);
    assert.equal(buildMerchantFeed([product()], null, resolveImage).diagnostics.excluded[0].reason, 'missing_resin_colors');
    assert.equal(resolveDefaultProductOffer(product(), []).reason, 'missing_resin_colors');
    const sourcedColors = colors.map(color => ({ ...color, isInStock: false }));
    const sourced = resolveDefaultProductOffer(product(), sourcedColors);
    assert.equal(sourced.reason, null);
    assert.equal(sourced.offer?.color.slug, 'black');
    assert.equal(sourced.offer?.price, 3230);
    assert.equal(sourced.offer?.availability, 'in_stock');
    const sourcedItem = parseItems(buildMerchantFeed([product()], sourcedColors, resolveImage).xml)[0];
    assert.equal(sourcedItem.price, '3230.00 UAH');
    assert.equal(sourcedItem.availability, 'in_stock');
  });

  it('escapes XML text, preserves Unicode, and removes forbidden controls/surrogates', () => {
    const value = `A & < > " ' 😀\u0000\u0008\uD800`;
    assert.equal(sanitizeXml(value), `A & < > " ' 😀`);
    const xml = buildMerchantFeed([product({ title: `Фігурка & "Ім'я" 😀\u0000\uD800`,
      description: 'Значення &lt; 2 &gt; 1 &#38; 3',
      variants: [{ ...variant, images: [{ ...photo, url: '/uploads/test.webp?a=1&b=2' }] }] })], colors, resolveImage).xml;
    const [item] = parseItems(xml);
    assert.ok(item.title.startsWith(`Фігурка & "Ім'я" 😀`));
    assert.ok(item.description.endsWith('Значення < 2 > 1 & 3'));
    assert.equal(item.image_link, 'https://api.skufnya.com/uploads/test.webp?a=1&b=2');
  });
});

describe('Merchant source fingerprint', () => {
  it('ignores API listing order but detects price, photo, description and default-color changes', () => {
    const a = product();
    const b = product({ id: 'product-2', slug: 'product-2' });
    const state = buildMerchantSourceState([a, b], colors);
    assert.match(state.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(state.productCount, 2);
    assert.deepEqual(state, buildMerchantSourceState([b, a], colors));
    for (const changed of [
      { ...a, description: 'New description' },
      { ...a, variants: [{ ...variant, price: 3131 }] },
      { ...a, variants: [{ ...variant, images: [{ ...photo, url: '/new.webp' }] }] },
      { ...a, isAdult: true },
      { ...a, ageRating: 'ADULT' },
    ]) assert.notEqual(state.fingerprint, buildMerchantSourceState([changed, b], colors).fingerprint);
    assert.notEqual(state.fingerprint, buildMerchantSourceState([a, b], colors.map(color => ({ ...color, priceDelta: 300 }))).fingerprint);
    assert.notEqual(state.fingerprint, buildMerchantSourceState([a, b], [...colors].reverse()).fingerprint);
  });
});


describe('reviewed configuration safety', () => {
  it('requires explicit image and identifier review, without inferring them from filenames or retail SKU', () => {
    const p = product({ attributes: null });
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.excluded[0].reason, 'unverified_configuration_image');
    p.attributes = { merchant: { defaultColorSlug: 'black', imageVariantId: 'v1', imageStorageKey: 'catalog/mono-black.webp' } };
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.excluded[0].reason, 'identifiers_review_required');
    p.attributes.merchant.identifierPolicy = 'NONE';
    assert.equal(parseItems(buildMerchantFeed([p], colors, resolveImage).xml).length, 1);
    p.attributes.merchant.imageVariantId = 'different';
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.includedCount, 0);
  });
  it('distinguishes age rating, prohibited content, the age gate and merchant exclusion', () => {
    const p = product();
    const settings = p.attributes!.merchant;
    p.ageRating = 'ADULT'; settings.content = 'GENERAL';
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.includedCount, 1);
    p.isAdult = true;
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.excluded[0].reason, 'age_gated_landing_page');
    settings.content = 'ADULT';
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.excluded[0].reason, 'adult_content_not_supported_ua');
    settings.enabled = false;
    assert.equal(buildMerchantFeed([p], colors, resolveImage).diagnostics.excluded[0].reason, 'merchant_disabled');
  });
  it('fingerprints every variant label, material, color, publication and image identity', () => {
    const p = product(); const before = buildMerchantSourceState([p], colors).fingerprint;
    for (const change of [
      (p: any) => p.variants[0].sizeLabel = 'new size',
      (p: any) => p.variants[0].outfitLabel = 'new outfit',
      (p: any) => p.variants[0].faceLabel = 'new face',
      (p: any) => p.material = 'new resin',
      (p: any) => p.attributes.merchant.enabled = false,
      (p: any) => p.images[0].alt = 'new alt',
      (p: any) => p.translations = [{ locale: 'en', material: 'New material' }],
    ]) { const changed = structuredClone(p); change(changed); assert.notEqual(buildMerchantSourceState([changed], colors).fingerprint, before); }
    assert.equal(buildMerchantSourceState([{ ...p, updatedAt: 'changed' }], colors).fingerprint, before);
  });
});

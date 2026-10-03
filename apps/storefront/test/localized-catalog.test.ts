import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getProductLocalizationVersion, getSourceProductPresentation, isEnglishProductReady,
  isProductIndexable, resolveProductPresentation,
} from '../src/i18n/catalog-policy.ts';
import { normalizeCatalogProductDetail } from '../src/lib/api.ts';
import { buildProductJsonLd, buildProductPageMeta } from '../src/lib/product-meta.ts';
import { assertCatalogPublicationStable, validateCatalogSnapshot } from '../src/lib/snapshot-integrity.ts';

const version = 'a'.repeat(64);
const translation = {
  locale: 'en', title: 'Editorial English title', shortDescription: 'English short description.',
  description: 'Complete editorial English description.', categoryName: 'Figures',
  metaTitle: 'English SEO title', metaDescription: 'English SEO description.',
};
function source(overrides: Record<string, any> = {}): any {
  return {
    id: 'p1', slug: 'stable-slug', title: 'Джерельна назва', sku: 'STABLE-SKU', status: 'ACTIVE',
    description: 'Джерельний опис', shortDescription: 'Короткий опис',
    metaTitle: 'Джерельний SEO заголовок', metaDescription: 'Джерельний SEO опис',
    series: 'Джерельна серія', material: 'Смола', countryOfOrigin: 'Україна',
    attributes: { note: 'Джерельна примітка', measurements: 17 },
    category: { id: 'cat1', slug: 'figures', name: 'Фігурки' },
    brand: { id: 'brand1', slug: 'brand', name: 'Proper Noun' },
    currency: 'UAH', priceFrom: 1000, isAdult: false, saleType: 'IN_STOCK',
    pricing: { priceFrom: 1000, priceTo: 1500, activeVariantCount: 2, hasPriceRange: true },
    images: [{ id: 'img1', url: '/uploads/cover.webp', alt: 'Джерельний alt', isCover: true }],
    coverImage: { url: '/uploads/cover.webp', alt: 'Джерельний alt' },
    variants: [{ id: 'variant1', name: 'Variant name', price: 1000, currency: 'UAH', images: [] }],
    translations: [], localization: { en: { ready: false, version: null } }, ...overrides,
  };
}
function ready(overrides: Record<string, any> = {}): any {
  return source({ translations: [{ ...translation, ...overrides }], localization: { en: { ready: true, version } } });
}
const media = (path?: string | null) => path ? `https://api.skufnya.com${path}` : null;

describe('localized catalog publication policy', () => {
  it('UK source does not depend on EN records, including the legacy API', () => {
    for (const product of [source(), source({ translations: undefined, localization: undefined }), ready()]) {
      const uk = resolveProductPresentation(product, 'uk');
      assert.equal(uk.title, product.title); assert.equal(uk.description, product.description);
      assert.equal(isProductIndexable('uk', product), true);
      assert.equal(uk.usesSourceContent, false);
    }
  });
  it('requires complete editorial content plus published/versioned backend state', () => {
    assert.equal(isEnglishProductReady(ready()), true);
    for (const field of ['title', 'shortDescription', 'description', 'categoryName']) {
      assert.equal(isEnglishProductReady(ready({ [field]: '  ' })), false);
    }
    for (const product of [
      source({ translations: [translation] }),
      ready({ locale: 'de' }),
      source({ translations: [translation, translation], localization: { en: { ready: true, version } } }),
      source({ translations: [translation], localization: { en: { ready: true, version: 'bad' } } }),
    ]) assert.equal(isEnglishProductReady(product), false);
  });
  it('keeps non-ready EN content wholly source and unindexed', () => {
    const product = ready({ shortDescription: '' });
    const en = resolveProductPresentation(product, 'en');
    assert.equal(en.title, product.title); assert.equal(en.description, product.description);
    assert.equal(en.usesSourceContent, true); assert.equal(isProductIndexable('en', product), false);
    assert.equal(getProductLocalizationVersion(product), 'untranslated');
  });
  it('resolves EN once without mutating source, pricing, identifiers, or optional source prose', () => {
    const product = ready(); const before = structuredClone(product);
    const en = resolveProductPresentation(product, 'en');
    assert.equal(en.title, translation.title); assert.equal(en.description, translation.description);
    assert.equal(en.shortDescription, translation.shortDescription); assert.equal(en.category.name, 'Figures');
    assert.equal(en.coverImage.alt, translation.title); assert.equal(en.images[0].alt, translation.title);
    for (const key of ['series', 'material', 'countryOfOrigin']) assert.equal(en[key], null);
    assert.equal(en.attributes, null);
    assert.deepEqual(en.brand, product.brand); assert.deepEqual(en.pricing, product.pricing);
    for (const key of ['id', 'slug', 'sku', 'priceFrom', 'currency', 'saleType']) assert.equal(en[key], product[key]);
    assert.equal(en.category.id, product.category.id); assert.equal(en.category.slug, product.category.slug);
    assert.equal(en.variants[0].id, product.variants[0].id);
    assert.equal(en.variants[0].price, product.variants[0].price);
    assert.deepEqual(product, before); assert.equal(en.usesSourceContent, false);
    assert.equal(isProductIndexable('en', en), true); assert.equal(getProductLocalizationVersion(en), version);
    const restored = getSourceProductPresentation(en);
    for (const key of ['title', 'series', 'description', 'coverImage', 'variants', 'attributes']) assert.deepEqual(restored[key], product[key]);
    assert.equal(resolveProductPresentation(en, 'uk').title, product.title);
    assert.equal(resolveProductPresentation(en, 'en').title, translation.title);
  });
  it('rejects invalid and unpublished presentation locale instead of falling back', () => {
    for (const locale of ['fr', 'de', null]) {
      assert.throws(() => resolveProductPresentation(ready(), locale as any));
      assert.throws(() => isProductIndexable(locale as any, ready()));
    }
  });
  it('source restoration cannot overwrite machine identifiers or pricing through internal backup fields', () => {
    const product = ready();
    const restored = getSourceProductPresentation({ ...product, sourcePresentation: {
      title: 'Source restored', id: 'wrong', slug: 'wrong', priceFrom: 1, currency: 'EUR',
      category: { id: 'wrong', slug: 'wrong', name: 'Source category restored' },
      coverImage: { url: 'wrong', alt: 'Source alt restored' },
      variants: [{ id: 'variant1', price: 1, currency: 'EUR', images: [] }],
    } });
    assert.equal(restored.title, 'Source restored');
    for (const field of ['id', 'slug', 'priceFrom', 'currency']) assert.equal(restored[field], product[field]);
    assert.equal(restored.category.id, product.category.id); assert.equal(restored.category.slug, product.category.slug);
    assert.equal(restored.category.name, 'Source category restored');
    assert.equal(restored.coverImage.url, product.coverImage.url); assert.equal(restored.coverImage.alt, 'Source alt restored');
    assert.equal(restored.variants[0].price, product.variants[0].price);
    assert.equal(restored.variants[0].currency, 'UAH');
  });
  it('normalization preserves the additive records and existing default fields', () => {
    const product = ready(); const normalized = normalizeCatalogProductDetail(product);
    assert.equal(normalized.title, product.title); assert.equal(normalized.description, product.description);
    assert.deepEqual(normalized.translations, product.translations);
    assert.deepEqual(normalized.localization, product.localization);
    assert.equal(resolveProductPresentation(normalized, 'en').title, translation.title);
  });
  it('snapshot accepts legacy/no EN products and rejects inconsistent additive publication envelopes', () => {
    const snapshot = (product: any) => ({ count: 1, items: [product] });
    for (const product of [source(), ready(), source({ translations: undefined, localization: undefined })]) {
      assert.deepEqual(validateCatalogSnapshot(snapshot(product)), []);
    }
    for (const product of [ready({ title: '' }), ready({ locale: 'de' }),
      source({ translations: [translation] }), source({ localization: { en: { ready: false, version } } }),
      source({ localization: { en: { ready: false, version: null }, de: { ready: false, version: null } } }),
      source({ localization: {}, translations: null })]) {
      assert.ok(validateCatalogSnapshot(snapshot(product)).length);
    }
  });
  it('collection rejects public product or translation state drift, even with equal counts', () => {
    assert.doesNotThrow(() => assertCatalogPublicationStable([ready(), source({ id: 'p2', slug: 'second' })],
      [source({ id: 'p2', slug: 'second' }), ready()]));
    for (const changed of [source(), ready({ title: '' }),
      { ...ready(), id: 'changed-id' }, { ...ready(), slug: 'renamed' },
      { ...ready(), localization: { en: { ready: true, version: 'b'.repeat(64) } } }]) {
      assert.throws(() => assertCatalogPublicationStable([ready()], [ready()], [changed]));
    }
    assert.throws(() => assertCatalogPublicationStable([ready(), ready()]));
  });
});

describe('translated SEO presentation', () => {
  it('uses translated metadata and JSON-LD presentation while preserving UAH offers', () => {
    const product = ready(); const en = resolveProductPresentation(product, 'en');
    const meta = buildProductPageMeta(en, media, 'en');
    assert.equal(meta.documentTitle, translation.metaTitle); assert.equal(meta.socialTitle, translation.title);
    assert.equal(meta.description, translation.metaDescription);
    assert.equal(meta.image.alt, translation.title);
    assert.equal(meta.canonicalUrl, 'https://www.skufnya.com/en/product/stable-slug/');
    const enLd = buildProductJsonLd(en, media, 'en'), ukLd = buildProductJsonLd(product, media, 'uk');
    assert.equal(enLd.name, translation.title); assert.equal(enLd.description, translation.description);
    assert.equal(enLd.category, translation.categoryName); assert.equal(enLd.sku, ukLd.sku);
    for (const key of ['price', 'priceCurrency', 'availability', 'hasMerchantReturnPolicy']) {
      assert.deepEqual((enLd.offers as any)[key], (ukLd.offers as any)[key]);
    }
    assert.equal((enLd.offers as any).priceCurrency, 'UAH');
  });
  it('SEO fallbacks stay inside reviewed English fields and never borrow source SEO text', () => {
    const en = resolveProductPresentation(ready({ metaTitle: null, metaDescription: ' ' }), 'en');
    const meta = buildProductPageMeta(en, media, 'en');
    assert.equal(meta.documentTitle, translation.title); assert.equal(meta.description, translation.shortDescription);
  });
  it('fallback JSON-LD describes the actual source product, with the functional EN URL', () => {
    const product = source(); const en = resolveProductPresentation(product, 'en');
    const data = buildProductJsonLd(en, media, 'en');
    assert.equal(data.name, product.title); assert.equal(data.description, product.description);
    assert.equal(data.url, 'https://www.skufnya.com/en/product/stable-slug/');
  });
});

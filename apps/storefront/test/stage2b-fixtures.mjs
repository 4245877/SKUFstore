// Synthetic editorial fixtures only; no existing product is translated or changed.
import { createHash } from 'node:crypto';
export const translation = {
  locale: 'en', title: 'English editorial fixture', shortDescription: 'English fixture short description.',
  description: 'English fixture full description with confirmed editorial content.', categoryName: 'Fixture figures',
  metaTitle: 'English fixture SEO title', metaDescription: 'English fixture SEO description.', imageAlt: 'English fixture image',
  brandName: null, franchiseName: null, characterName: null, series: null, material: 'Resin', countryOfOrigin: 'Ukraine',
};
export const translationVersion = createHash('sha256').update(JSON.stringify(translation)).digest('hex');
function product(slug, title, priceFrom, ready) {
  const id = `fixture-${slug}`;
  return {
    id, slug, title, sku: `SKU-${slug}`, status: 'ACTIVE', shortDescription: 'Вихідний короткий опис.',
    description: 'Вихідний повний опис товару.', metaTitle: 'Вихідний SEO заголовок', metaDescription: 'Вихідний SEO опис.',
    isAdult: false, saleType: 'IN_STOCK', ageRating: 'ALL', priceFrom, currency: 'UAH', stockQty: 3,
    productType: 'FIGURE', series: null, material: 'Смола', countryOfOrigin: 'Україна', attributes: null,
    qualityScore: 10, showOnHome: true,
    category: { id: 'fixture-category', slug: 'fixture-category', name: 'Вихідна категорія' }, brand: null, franchise: null, character: null,
    coverImage: { url: `/uploads/stage2b/${slug}.webp`, alt: 'Вихідний image alt' }, ogImage: { url: `/uploads/stage2b/${slug}.jpg`, alt: 'Вихідний image alt' },
    images: [{ id: `${id}-image`, url: `/uploads/stage2b/${slug}.webp`, alt: 'Вихідний image alt', isCover: true, storageKey: null }],
    pricing: { priceFrom, priceTo: priceFrom + 200, activeVariantCount: 2, hasPriceRange: true },
    variants: [0, 1].map(i => ({ id: `${id}-variant-${i}`, name: `Variant ${i}`, optionKey: `option-${i}`, sku: `SKU-${slug}-${i}`,
      price: priceFrom + i * 200, currency: 'UAH', sizeLabel: 'M', stockQty: 3, reservedQty: 0, resinGrams: 100,
      isDefault: i === 0, isActive: true, images: [], attributes: null })),
    translations: ready ? [translation] : [], localization: { en: { ready, version: ready ? translationVersion : null } },
  };
}
export const products = [product('editorial-ready', 'Вихідний редакційний товар', 1000, true), product('source-only', 'Товар без перекладу', 1200, false), product('legacy-source', 'Історичний товар', 900, false)];
delete products[2].translations; delete products[2].localization;
export const resinColors = [{ id: 'fixture-color', slug: 'fixture-black', name: 'Чорний', hexColor: '#111111', priceDelta: 200, isInStock: true, isActive: true, sortOrder: 0 }];
export function fixtureResponse(url) {
  const path = url.pathname;
  if (path === '/api/catalog/resin-colors') return { items: resinColors };
  if (path === '/api/catalog/categories') return { items: [{ id: 'fixture-category', slug: 'fixture-category', name: 'Вихідна категорія', children: [] }] };
  if (path === '/api/shipping/policy') return { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 };
  if (path === '/api/catalog/products/export') return { items: products, count: products.length };
  if (path === '/api/catalog/products/home') return { items: products };
  if (path === '/api/catalog/products') {
    const q = url.searchParams, locale = q.get('locale') || 'uk';
    let items = products.filter(p => !q.get('q') || [p.title, locale === 'en' ? p.translations?.[0]?.title : null].filter(Boolean).some(title => title.toLowerCase().includes(q.get('q').toLowerCase())));
    if (q.get('minPrice')) items = items.filter(p => p.priceFrom >= +q.get('minPrice'));
    if (q.get('maxPrice')) items = items.filter(p => p.priceFrom <= +q.get('maxPrice'));
    if (q.get('sort') === 'price_asc') items.sort((a, b) => a.priceFrom - b.priceFrom);
    if (q.get('sort') === 'price_desc') items.sort((a, b) => b.priceFrom - a.priceFrom);
    const page = +(q.get('page') || 1), limit = +(q.get('limit') || 24), total = items.length;
    return { items: items.slice((page - 1) * limit, page * limit), meta: { page, limit, total, pageCount: Math.ceil(total / limit) } };
  }
  if (path.startsWith('/api/catalog/products/')) {
    const item = products.find(p => p.slug === decodeURIComponent(path.split('/').at(-1)));
    if (item) return item;
  }
  throw new Error('Unexpected synthetic API request: ' + path);
}

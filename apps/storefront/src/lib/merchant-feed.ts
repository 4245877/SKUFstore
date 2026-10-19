import { createHash } from 'node:crypto';
import { merchantSettings, verifiedOfferImages } from './merchant-settings.ts';
import type { CatalogProductDetail, CatalogResinColor } from './api';
import { buildProductUrl, toPlainText, type MediaUrlResolver } from './product-meta.ts';
import { resolveDefaultProductOffer, type DefaultProductOfferIssue } from './product-offer.ts';

const SITE_URL = 'https://www.skufnya.com';

export type MerchantFeedIssue = DefaultProductOfferIssue | 'inactive_product'
  | 'missing_title' | 'missing_description' | 'missing_product_image' | 'invalid_gtin'
  | 'incomplete_product_identifiers' | 'merchant_disabled' | 'adult_content_review_required'
  | 'adult_content_not_supported_ua' | 'age_gated_landing_page' | 'unverified_configuration_image'
  | 'identifiers_review_required' | 'invalid_google_category';
export type MerchantFeedExclusion = { id: string; slug: string; reason: MerchantFeedIssue };
export type MerchantFeedResult = {
  xml: string;
  diagnostics: { productCount: number; includedCount: number; excluded: MerchantFeedExclusion[] };
};

/** Strip characters forbidden by XML 1.0, including lone UTF-16 surrogates. */
export function sanitizeXml(value: string): string {
  return Array.from(value).filter((character) => {
    const point = character.codePointAt(0)!;
    return point === 0x9 || point === 0xa || point === 0xd ||
      (point >= 0x20 && point <= 0xd7ff) || (point >= 0xe000 && point <= 0xfffd) ||
      (point >= 0x10000 && point <= 0x10ffff);
  }).join('');
}

function escapeXml(value: string): string {
  return sanitizeXml(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function plainLimit(value: string, limit: number): string {
  return Array.from(sanitizeXml(value)).slice(0, limit).join('');
}
function text(value: unknown, limit: number): string {
  return plainLimit(toPlainText(typeof value === 'string' ? value : ''), limit);
}

function validHttpUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

function validGtin(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}

/** Refuse a broken collection instead of replacing the previous healthy feed. */
function assertCollection(products: CatalogProductDetail[]): void {
  if (!Array.isArray(products)) throw new Error('Merchant catalog is not an array');
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const product of products) {
    if (!product || typeof product.id !== 'string' || !product.id.trim() ||
        product.id.length > 50 || sanitizeXml(product.id) !== product.id ||
        typeof product.slug !== 'string' || !product.slug.trim() ||
        !Array.isArray(product.variants) || !Array.isArray(product.images)) {
      throw new Error('Merchant catalog contains a malformed product identity, images or variants');
    }
    if (ids.has(product.id) || slugs.has(product.slug)) throw new Error(`Duplicate Merchant product: ${product.id}/${product.slug}`);
    ids.add(product.id);
    slugs.add(product.slug);
  }
}

/**
 * One stable item per product, matching the first configuration on its Ukrainian
 * landing page. Franchise/retail SKU are not manufacturer brand/MPN. Optional
 * explicit gtin/mpn/manufacturerBrand fields are used only when actually supplied.
 */
export function buildMerchantFeed(
  products: CatalogProductDetail[],
  colors: CatalogResinColor[] | null,
  resolveImageUrl: MediaUrlResolver,
): MerchantFeedResult {
  assertCollection(products);
  const excluded: MerchantFeedExclusion[] = [];
  const items: string[] = [];
  for (const product of [...products].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const exclude = (reason: MerchantFeedIssue) => excluded.push({ id: product.id, slug: product.slug, reason });
    if (product.status !== 'ACTIVE') { exclude('inactive_product'); continue; }
    const settings = merchantSettings(product);
    if (settings.enabled === false) { exclude('merchant_disabled'); continue; }
    if (settings.content === 'ADULT') { exclude('adult_content_not_supported_ua'); continue; }
    if ((product.isAdult || product.ageRating === 'ADULT') && settings.content !== 'GENERAL') {
      exclude('adult_content_review_required'); continue;
    }
    if (product.isAdult) { exclude('age_gated_landing_page'); continue; }
    const title = text(product.title, 150);
    if (!title) { exclude('missing_title'); continue; }
    const description = text(product.description, 5000) || text(product.shortDescription, 5000);
    if (!description) { exclude('missing_description'); continue; }
    const { offer, reason } = resolveDefaultProductOffer(product, colors);
    if (!offer) { exclude(reason!); continue; }
    const verified = verifiedOfferImages(product, offer.variant, offer.color);
    if (!verified.length) { exclude('unverified_configuration_image'); continue; }
    const imageUrls = verified.map(image => resolveImageUrl(image.url));
    const image = imageUrls[0];
    if (!validHttpUrl(image) || /\/(?:opengraph-image|placeholder)(?:[./?]|$)/i.test(new URL(image).pathname)) {
      exclude('missing_product_image'); continue;
    }

    const rawGtin = settings.gtin ?? offer.variant.gtin ?? product.gtin;
    const gtin = text(rawGtin, 50);
    const mpn = text(settings.mpn ?? offer.variant.mpn ?? product.mpn, 70);
    const brand = text(settings.manufacturerBrand ?? offer.variant.manufacturerBrand ?? product.manufacturerBrand, 70);
    if ((rawGtin != null && rawGtin !== '') && (!gtin || !validGtin(gtin))) { exclude('invalid_gtin'); continue; }
    if ((mpn && !brand) || (settings.identifierPolicy === 'NONE' && (gtin || mpn))) { exclude('incomplete_product_identifiers'); continue; }
    if (!gtin && !(brand && mpn) && settings.identifierPolicy !== 'NONE') {
      exclude('identifiers_review_required'); continue;
    }
    if (settings.googleProductCategory && !/^\d+$/.test(settings.googleProductCategory)) {
      exclude('invalid_google_category'); continue;
    }
    const configuration = text([offer.variant.name, offer.variant.sizeLabel,
      offer.variant.outfitLabel, offer.variant.faceLabel, 'Монохромна версія', offer.color.name].filter(Boolean).join(' · '), 300);
    const fields: Array<[string, string]> = [
      ['g:id', product.id], ['g:title', plainLimit(`${title} — ${configuration}`, 150)], ['g:description', plainLimit(`${configuration}. ${description}`, 5000)],
      ['g:link', buildProductUrl(product.slug)], ['g:image_link', image],
      ['g:price', `${offer.price.toFixed(2)} UAH`], ['g:availability', offer.availability],
      ['g:condition', 'new'],
      // no means no assigned GTIN and no brand+MPN pair. It must be revisited if
      // the merchant assigns identifiers; never invent a barcode or reuse SKU.
      ['g:identifier_exists', gtin || (brand && mpn) ? 'yes' : 'no'],
    ];
    for (const additional of imageUrls.slice(1, 11)) {
      if (validHttpUrl(additional)) fields.push(['g:additional_image_link', additional]);
    }
    if (settings.googleProductCategory) fields.push(['g:google_product_category', settings.googleProductCategory]);
    if (product.category?.name) fields.push(['g:product_type', text(product.category.name, 750)]);
    // One item per product: item_group_id is unnecessary until multiple variants are exported.
    if (offer.availabilityDate) fields.push(['g:availability_date', offer.availabilityDate]);
    if (gtin) fields.push(['g:gtin', gtin]);
    if (mpn) fields.push(['g:mpn', mpn]);
    if (brand) fields.push(['g:brand', brand]);
    items.push(`    <item>\n${fields.map(([key, value]) => `      <${key}>${escapeXml(value)}</${key}>`).join('\n')}\n    </item>`);
  }

  return {
    xml: `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>SKUFnya</title>\n    <link>${SITE_URL}/</link>\n    <description>Товари SKUFnya для безкоштовних пропозицій Google</description>\n${items.join('\n')}\n  </channel>\n</rss>\n`,
    diagnostics: { productCount: products.length, includedCount: items.length, excluded },
  };
}

export type MerchantSourceState = { version: 2; fingerprint: string; productCount: number };

/** Canonicalize object keys, preserve ordered variant/gallery/color arrays. Never hash generatedAt. */
export function canonicalSource(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalSource);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key, value]) => value !== undefined && !['createdAt', 'updatedAt', 'generatedAt', 'calculatedAt'].includes(key))
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => [key, canonicalSource(value)]));
  return value;
}

/** All public commercial/editorial fields, including future additive API fields. */
export function buildMerchantSourceState(products: CatalogProductDetail[], colors: CatalogResinColor[] | null): MerchantSourceState {
  assertCollection(products);
  const source = canonicalSource({ products: [...products].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), colors });
  return { version: 2, fingerprint: createHash('sha256').update(JSON.stringify(source)).digest('hex'), productCount: products.length };
}

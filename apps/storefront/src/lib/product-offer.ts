import type { CatalogProductDetail, CatalogProductImage, CatalogProductVariant, CatalogResinColor } from './api';
import { configurationPrice, defaultProductColorSlug, merchantSettings } from './merchant-settings.ts';

export type DefaultProductOfferIssue =
  | 'missing_default_variant'
  | 'unavailable_default_configuration'
  | 'missing_resin_colors'
  | 'invalid_price'
  | 'unsupported_currency'
  | 'unsupported_availability'
  | 'missing_availability_date';

export type DefaultProductOffer = {
  variant: CatalogProductVariant;
  color: CatalogResinColor;
  finish: 'MONO';
  price: number;
  currency: 'UAH';
  availability: 'in_stock' | 'preorder' | 'backorder';
  schemaAvailability: string;
  availabilityDate?: string;
};

/** The first view of the landing page, rather than the cheapest configuration. */
export function pickDefaultProductVariant(product: CatalogProductDetail): CatalogProductVariant | null {
  return product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null;
}

const FINISH_IMAGE_KEYWORDS = {
  MONO: ['mono', 'monochrome', 'моно', 'monochrom'],
  PAINTED: ['painted', 'painting', 'paint', 'art', 'розпис', 'худож'],
};
const COLOR_IMAGE_KEYWORD_ALIASES: Record<string, string[]> = {
  ivory: ['ivori', 'cream', 'creme', 'молоч'], graphite: ['grafit', 'charcoal'],
  black: ['chorniy', 'chornyi'], pearl: ['перламутр', 'перламутров', 'perl'],
};

/** Preserve storefront gallery ranking; filenames do not establish Merchant image eligibility. */
export function buildProductGalleryImages(
  productImages: CatalogProductImage[],
  variant: CatalogProductVariant | null,
  finish: 'MONO' | 'PAINTED',
  color: CatalogResinColor | null,
): CatalogProductImage[] {
  const seen = new Set<string>();
  const deduped = [...(variant?.images ?? []), ...productImages].filter(image => {
    const key = image.storageKey || image.url || image.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const slug = color?.slug.toLowerCase() ?? '';
  const colorKeywords = color
    ? [slug, color.name.trim().toLowerCase(), ...(COLOR_IMAGE_KEYWORD_ALIASES[slug] ?? [])].filter(Boolean) : [];
  const ranked = deduped.map((image, index) => {
    const search = `${image.alt ?? ''} ${image.storageKey ?? ''} ${image.url ?? ''}`.toLowerCase();
    return { image, index, isCover: Boolean(image.isCover),
      finishMatched: FINISH_IMAGE_KEYWORDS[finish].some(keyword => search.includes(keyword)),
      colorMatched: finish === 'MONO' && colorKeywords.some(keyword => search.includes(keyword)) };
  });
  const hasFinishMatches = ranked.some(item => item.finishMatched);
  const hasColorMatches = finish === 'MONO' && ranked.some(item => item.colorMatched);
  if (!hasFinishMatches && !hasColorMatches) return deduped;
  return ranked.sort((a, b) => {
    if (hasColorMatches && a.colorMatched !== b.colorMatched) return Number(b.colorMatched) - Number(a.colorMatched);
    if (hasFinishMatches && a.finishMatched !== b.finishMatched) return Number(b.finishMatched) - Number(a.finishMatched);
    if (a.isCover !== b.isCover) return Number(b.isCover) - Number(a.isCover);
    return a.index - b.index;
  }).map(item => item.image);
}

export function getProductAvailabilityDate(product: CatalogProductDetail, variant: CatalogProductVariant): string | undefined {
  const value = variant.availabilityDate ?? merchantSettings(product).availabilityDate ?? product.availabilityDate;
  // A date supplied by the merchant is required. A generic production lead time
  // does not establish the date on which a preorder/backorder can be shipped.
  if (typeof value !== 'string') return undefined;
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/);
  if (!parts || !Number.isFinite(Date.parse(value))) return undefined;
  const daysAhead = (Date.parse(value) - Date.now()) / 86400000;
  if (daysAhead < 0 || daysAhead > 366) return undefined;
  const [, year, month, day, hour, minute, second = '00'] = parts.map(Number);
  if (month < 1 || month > 12 || day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || Number(second) > 59) return undefined;
  return value;
}

/**
 * Shared by Product/Offer markup and the Merchant feed. Never substitute the
 * browser's fallback color palette: it cannot prove a real purchasable price.
 */
export function resolveDefaultProductOffer(
  product: CatalogProductDetail,
  colors: CatalogResinColor[] | null | undefined,
): { offer: DefaultProductOffer | null; reason: DefaultProductOfferIssue | null } {
  const reject = (reason: DefaultProductOfferIssue) => ({ offer: null, reason });
  const variant = pickDefaultProductVariant(product);
  if (!variant?.id) return reject('missing_default_variant');
  if (variant.isActive === false) return reject('unavailable_default_configuration');
  if (!colors?.length) return reject('missing_resin_colors');
  const color = colors.find((candidate) => candidate.slug === defaultProductColorSlug(product, colors));
  // isInStock controls the preferred color, not checkout eligibility: the
  // storefront also accepts made-to-order purchases of active sourced colors.
  if (!color?.slug) return reject('unavailable_default_configuration');

  const price = configurationPrice(variant.price, color.priceDelta);
  if (!Number.isFinite(variant.price) || variant.price <= 0 || !Number.isFinite(color.priceDelta) ||
      !Number.isFinite(price) || price <= 0 || Math.round(price * 100) <= 0) return reject('invalid_price');
  if (variant.currency !== 'UAH' || product.currency !== 'UAH') return reject('unsupported_currency');

  let availability: DefaultProductOffer['availability'];
  let schemaAvailability: string;
  let date: string | undefined;
  switch (product.saleType) {
    case 'IN_STOCK':
      // This shop accepts made-to-order purchases regardless of physical stock;
      // Zero finished stock does not disable made-to-order checkout.
      availability = 'in_stock';
      schemaAvailability = 'https://schema.org/InStock';
      break;
    case 'PREORDER':
    case 'BACKORDER':
      date = getProductAvailabilityDate(product, variant);
      if (!date) return reject('missing_availability_date');
      availability = product.saleType === 'PREORDER' ? 'preorder' : 'backorder';
      schemaAvailability = product.saleType === 'PREORDER'
        ? 'https://schema.org/PreOrder' : 'https://schema.org/BackOrder';
      break;
    default:
      return reject('unsupported_availability');
  }

  return {
    offer: { variant, color, finish: 'MONO', price, currency: 'UAH', availability, schemaAvailability,
      ...(date ? { availabilityDate: date } : {}) },
    reason: null,
  };
}

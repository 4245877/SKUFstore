import { assertPublishedLocale, type PublishedLocale } from './locales.ts';

/** Editorial presentation only. None of these fields participates in commerce identity. */
export type CatalogTranslation = {
  locale: 'en';
  title: string;
  shortDescription: string;
  description: string;
  categoryName: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  imageAlt?: string | null;
  brandName?: string | null;
  franchiseName?: string | null;
  characterName?: string | null;
  series?: string | null;
  material?: string | null;
  countryOfOrigin?: string | null;
};

export type CatalogLocalization = { en: { ready: boolean; version: string | null } };
export type LocalizedCatalogFields = {
  translations?: CatalogTranslation[];
  localization?: CatalogLocalization;
};

type PresentationSource = LocalizedCatalogFields & { title: string; [key: string]: any };
export const PRODUCT_ROUTE_LOCALES = ['uk', 'en'] as const;
const REQUIRED_EN_FIELDS = ['title', 'shortDescription', 'description', 'categoryName'] as const;

export function isEnglishProductReady(product: LocalizedCatalogFields): boolean {
  const state = product.localization?.en;
  if (state?.ready !== true || !/^[a-f0-9]{64}$/.test(state.version ?? '')) return false;
  if (!Array.isArray(product.translations) || product.translations.length !== 1) return false;
  const translation = product.translations[0];
  return translation?.locale === 'en' && REQUIRED_EN_FIELDS.every(field =>
    typeof translation[field] === 'string' && translation[field].trim().length > 0);
}

/** Validate an additive public envelope while accepting untouched legacy DTOs. */
export function productLocalizationIssues(product: LocalizedCatalogFields): string[] {
  if (product.translations === undefined && product.localization === undefined) return [];
  const localization = product.localization;
  const state = localization?.en;
  if (!localization || typeof localization !== 'object' || Array.isArray(localization) ||
      Object.keys(localization).length !== 1 || !Object.hasOwn(localization, 'en') ||
      !state || typeof state !== 'object' || Array.isArray(state) ||
      typeof state.ready !== 'boolean' || !Array.isArray(product.translations)) {
    return ['invalid localization envelope'];
  }
  if (state.ready) return isEnglishProductReady(product) ? [] : ['invalid ready EN content/version'];
  return state.version === null && product.translations.length === 0
    ? [] : ['unpublished EN content leaked into public snapshot'];
}

export function isProductIndexable(locale: PublishedLocale, product: LocalizedCatalogFields = {}): boolean {
  assertPublishedLocale(locale);
  return locale === 'uk' || isEnglishProductReady(product);
}

/** Both language documents carry this fingerprint for live reconciliation. */
export function getProductLocalizationVersion(product: LocalizedCatalogFields): string {
  return isEnglishProductReady(product) ? product.localization!.en.version! : 'untranslated';
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const PRESENTATION_FIELDS = ['title', 'shortDescription', 'description', 'metaTitle', 'metaDescription',
  'series', 'material', 'countryOfOrigin', 'category', 'brand', 'franchise', 'character',
  'coverImage', 'ogImage', 'images', 'variants', 'attributes'] as const;

/** Restore source presentation before persisting favorites or a current cart snapshot. */
export function getSourceProductPresentation<T extends PresentationSource>(product: T): T {
  if (!product.sourcePresentation) return product;
  const backup = product.sourcePresentation;
  const restored: Record<string, unknown> = {};
  for (const field of ['title', 'shortDescription', 'description', 'metaTitle', 'metaDescription',
    'series', 'material', 'countryOfOrigin', 'attributes']) {
    if (Object.hasOwn(backup, field)) restored[field] = backup[field];
  }
  // Restore only presentation within nested records. Even malformed internal
  // backup data cannot replace IDs, slugs, image URLs, or variant prices.
  for (const field of ['category', 'brand', 'franchise', 'character']) {
    if (product[field] && backup[field] && Object.hasOwn(backup[field], 'name')) {
      restored[field] = { ...product[field], name: backup[field].name };
    }
  }
  const restoreImage = (current: any, original: any) => current && original && Object.hasOwn(original, 'alt')
    ? { ...current, alt: original.alt } : current;
  const originalImages = Array.isArray(backup.images) ? backup.images : [];
  const originalVariants = Array.isArray(backup.variants) ? backup.variants : [];
  for (const field of ['coverImage', 'ogImage']) restored[field] = restoreImage(product[field], backup[field]);
  restored.images = product.images?.map((image: any, index: number) =>
    restoreImage(image, originalImages.find((original: any) => original.id === image.id) ?? originalImages[index]));
  restored.variants = product.variants?.map((variant: any) => {
    const original = originalVariants.find((entry: any) => entry.id === variant.id);
    const images = Array.isArray(original?.images) ? original.images : [];
    return { ...variant, images: variant.images?.map((image: any, index: number) =>
      restoreImage(image, images.find((entry: any) => entry.id === image.id) ?? images[index])) };
  });
  return { ...product, ...restored, sourcePresentation: undefined };
}

/** One all-or-nothing rule for static pages and runtime cards. */
export function resolveProductPresentation<T extends PresentationSource>(product: T, locale: PublishedLocale): T & {
  presentationLocale: PublishedLocale; usesSourceContent: boolean;
} {
  assertPublishedLocale(locale);
  const source = getSourceProductPresentation(product);
  if (locale === 'uk' || !isEnglishProductReady(source)) {
    return { ...source, presentationLocale: locale, usesSourceContent: locale === 'en' };
  }
  const translation = source.translations![0];
  const title = translation.title.trim();
  const imageAlt = optionalText(translation.imageAlt) ?? title;
  const image = (value: any) => value ? { ...value, alt: imageAlt } : value;
  const entity = (value: any, name: unknown) => value ? { ...value, name: optionalText(name) ?? value.name } : value;
  const sourcePresentation = Object.fromEntries(PRESENTATION_FIELDS.map(field => [field, source[field]]));
  return {
    ...source, title,
    shortDescription: translation.shortDescription.trim(),
    description: translation.description.trim(),
    metaTitle: optionalText(translation.metaTitle),
    metaDescription: optionalText(translation.metaDescription),
    // Descriptive labels cannot quietly inherit source-language prose.
    series: optionalText(translation.series),
    material: optionalText(translation.material),
    countryOfOrigin: optionalText(translation.countryOfOrigin),
    // Arbitrary key/value attributes have no editorial localization contract.
    attributes: null,
    category: entity(source.category, translation.categoryName),
    brand: entity(source.brand, translation.brandName),
    franchise: entity(source.franchise, translation.franchiseName),
    character: entity(source.character, translation.characterName),
    coverImage: image(source.coverImage), ogImage: image(source.ogImage),
    images: source.images?.map(image),
    variants: source.variants?.map((variant: any) => ({ ...variant, images: variant.images?.map(image) })),
    sourcePresentation, presentationLocale: locale, usesSourceContent: false,
  };
}

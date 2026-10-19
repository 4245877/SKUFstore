import type { CatalogProductDetail, CatalogProductImage, CatalogProductVariant, CatalogResinColor } from './api';
import { pickDefaultColorSlug } from './resin-colors.ts';

/** Stored in the existing Product.attributes JSON; no second product data model. */
export type MerchantSettings = {
  enabled?: boolean;
  content?: 'UNREVIEWED' | 'GENERAL' | 'ADULT';
  defaultColorSlug?: string;
  imageVariantId?: string;
  imageStorageKey?: string;
  additionalImageStorageKeys?: string[];
  identifierPolicy?: 'UNREVIEWED' | 'NONE' | 'ASSIGNED';
  manufacturerBrand?: string;
  mpn?: string;
  gtin?: string;
  googleProductCategory?: string;
  availabilityDate?: string;
};
export function merchantSettings(product: CatalogProductDetail): MerchantSettings {
  return product.attributes?.merchant ?? product.sourcePresentation?.attributes?.merchant ?? {};
}
export function defaultProductColorSlug(product: CatalogProductDetail, colors: CatalogResinColor[]): string {
  return merchantSettings(product).defaultColorSlug || pickDefaultColorSlug(colors);
}
export function originalImageKey(key?: string | null): string {
  return (key ?? '').replace(/^catalog\/(?:large|thumb|og)\//, 'catalog/');
}
/** Explicit merchant confirmation binds the image to a variant, MONO finish and resin color. */
export function verifiedOfferImages(product: CatalogProductDetail, variant: CatalogProductVariant,
  color: CatalogResinColor): CatalogProductImage[] {
  const settings = merchantSettings(product);
  if (!settings.imageStorageKey || settings.imageVariantId !== variant.id || settings.defaultColorSlug !== color.slug) return [];
  const images = [...variant.images, ...product.images];
  if (!images.some(image => originalImageKey(image.storageKey) === originalImageKey(settings.imageStorageKey))) return [];
  const keys = [settings.imageStorageKey, ...(settings.additionalImageStorageKeys ?? []).slice(0, 10)];
  return keys.flatMap(key => {
    const image = images.find(image => originalImageKey(image.storageKey) === originalImageKey(key));
    return image ? [image] : [];
  }).filter((image, index, all) => all.findIndex(other => other.url === image.url) === index);
}
export function configurationPrice(variantPrice: number, colorDelta: number): number {
  // The API owns variant pricing; MONO has no finish surcharge (order-pricing.ts).
  return variantPrice + colorDelta;
}

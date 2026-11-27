import type { CatalogProductDetail, CatalogProductVariant } from './api';
import type { PublishedLocale } from '../i18n/locales';
import type { Translator } from '../i18n/translate';
import { formatDayCount } from '../i18n/presentation.ts';

export type PurchaseInfo = {
  assembly?: 'UNASSEMBLED' | 'ASSEMBLED' | 'BY_AGREEMENT';
  contentsUk?: string;
  contentsEn?: string;
};

/** Variant size wins. Product height describes the base model and must not
 * contradict a different selected size. A scale can accompany that height. */
export function productSize(product: { heightMm?: number | null; variants?: Pick<CatalogProductVariant, 'sizeLabel'>[] },
  variant: Pick<CatalogProductVariant, 'sizeLabel'> | null, t: Translator): string | null {
  const label = variant?.sizeLabel?.trim();
  const distinctSizes = new Set(product.variants?.map(v => v.sizeLabel?.trim()).filter(Boolean) ?? []);
  const height = distinctSizes.size <= 1 && typeof product.heightMm === 'number' && product.heightMm > 0
    ? t('shop.valueMm', { value1: product.heightMm }) : null;
  if (!label) return height;
  const scaleOnly = /^(?:1\s*[:/]\s*\d+(?:\.\d+)?)$/.test(label);
  return scaleOnly && height ? `${label} · ${height}` : label;
}

export function productionTime(variant: Pick<CatalogProductVariant, 'leadTimeDays'> | null,
  t: Translator, locale: PublishedLocale): string {
  const days = variant?.leadTimeDays;
  return typeof days === 'number' && Number.isInteger(days) && days > 0
    ? t('shop.withinValue', { value1: formatDayCount(t, locale, days) })
    : t('purchase.timeUnknown');
}

export function finishDescription(finish: 'MONO' | 'PAINTED', t: Translator): string {
  return finish === 'MONO' ? t('purchase.mono') : t('shop.artisticPainting');
}

export function assemblyDescription(info: PurchaseInfo | undefined, t: Translator): string {
  if (info?.assembly === 'UNASSEMBLED') return t('purchase.unassembled');
  if (info?.assembly === 'ASSEMBLED') return t('purchase.assembled');
  return t('purchase.assemblyUnknown');
}

/** Editorial English copy is optional; never invent it or change SEO readiness. */
export function packageDescription(info: PurchaseInfo | undefined, locale: PublishedLocale): string | null {
  return (locale === 'en' ? info?.contentsEn : info?.contentsUk)?.trim() || null;
}

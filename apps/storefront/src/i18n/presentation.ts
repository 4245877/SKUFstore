import type { OrderConfigurationSnapshot } from '../lib/api.ts';
import type { CartItem } from '../lib/cart-lines.ts';
import { LOCALE_PRESENTATION, type PublishedLocale } from './locales.ts';
import { getTranslator, type Translator, type TranslationKey } from './translate.ts';

/** Presentation only: neither source records nor financial data are changed. */
export function formatLocaleDate(value: string, locale: PublishedLocale, month: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat(LOCALE_PRESENTATION[locale].languageTag, {
    day: month === 'long' ? '2-digit' : 'numeric', month, year: 'numeric',
  }).format(new Date(value));
}

const STATUS_KEYS = {
  pending: 'account.awaitingConfirmation', confirmed: 'account.confirmed',
  awaiting_payment: 'account.awaitingPayment', paid: 'account.paid',
  processing: 'account.inProgress', shipped: 'account.shipped', delivered: 'account.delivered',
  cancelled: 'account.cancelled', returned: 'account.return',
} as const satisfies Record<string, TranslationKey>;

export function orderStatusLabel(t: Translator, status: string): string {
  const value = String(status ?? '').toLowerCase();
  return Object.hasOwn(STATUS_KEYS, value)
    ? t(STATUS_KEYS[value as keyof typeof STATUS_KEYS]) : t('account.unknown');
}

const COUNT_KEYS = {
  products: ['shop.product_757', 'shop.products', 'shop.products_759'],
  categories: ['home.category', 'home.categories', 'home.categories_1130'],
  figures: ['shop.figure', 'shop.figures', 'shop.figures_974'],
} as const;

function pluralIndex(locale: PublishedLocale, count: number): 0 | 1 | 2 {
  const form = new Intl.PluralRules(LOCALE_PRESENTATION[locale].languageTag).select(count);
  return form === 'one' ? 0 : form === 'few' ? 1 : 2;
}

export function countNoun(t: Translator, locale: PublishedLocale, count: number, noun: keyof typeof COUNT_KEYS): string {
  return t(COUNT_KEYS[noun][pluralIndex(locale, count)]);
}

export function formatDayCount(t: Translator, locale: PublishedLocale, days: number): string {
  const keys = ['shop.valueDay', 'shop.valueDays', 'shop.valueDays_1044'] as const;
  return t(keys[pluralIndex(locale, days)], { value1: days });
}

export function orderPaymentLabel(t: Translator, paymentMethod: string): string {
  switch (paymentMethod) {
    case 'card': return t('account.cardPayment');
    case 'cash-on-delivery': return t('account.cashOnDelivery');
    case 'partial-prepayment': return t('content.60AdvancePayment');
    case 'full-prepayment': return t('content.fullAdvancePayment');
    default: return t('shop.arrangedAfterOrdering');
  }
}

/** Translate the structured finish only. Resin color names remain catalog data. */
export function presentConfiguration(t: Translator, snapshot?: OrderConfigurationSnapshot | null): string {
  if (!snapshot) return '';
  const finish = snapshot.finish === 'MONO' ? t('shop.monochromeVersion')
    : snapshot.finish === 'PAINTED' ? t('shop.artisticPainting') : snapshot.finishLabel;
  return [finish, snapshot.color?.name].filter(Boolean).join(' · ');
}

/** Preserve the variant/source text and replace only its explicit snapshot suffix. */
export function presentItemSubtitle(t: Translator, subtitle?: string | null, snapshot?: OrderConfigurationSnapshot | null): string {
  const text = subtitle ?? '';
  if (!snapshot) return text;
  const source = [snapshot.finishLabel, snapshot.color?.name].filter(Boolean).join(' · ');
  if (!source) return text;
  const translated = presentConfiguration(t, snapshot);
  if (text === source) return translated;
  const suffix = ` · ${source}`;
  return text.endsWith(suffix) ? text.slice(0, -suffix.length) + ` · ${translated}` : text;
}

/** Current cart selections can precede a quote. Translate only their generated UI suffix. */
export function presentCartItemSubtitle(t: Translator, item: Pick<CartItem, 'subtitle' | 'configurationSnapshot' | 'finish' | 'colorSlug'>): string {
  if (item.configurationSnapshot) return presentItemSubtitle(t, item.subtitle, item.configurationSnapshot);
  const text = item.subtitle ?? '';
  const key = item.finish === 'MONO' ? 'shop.monochromeVersion'
    : item.finish === 'PAINTED' ? 'shop.artisticPainting' : null;
  if (!key) return text;
  const parts = text.split(' · ');
  const hasColor = item.finish === 'MONO' && Boolean(item.colorSlug);
  const finishIndex = parts.length - (hasColor ? 2 : 1);
  // A generated subtitle has a source prefix before its finish/color suffix.
  if (finishIndex < 1 || !(['uk', 'en'] as const).some(locale => parts[finishIndex] === getTranslator(locale)(key))) return text;
  parts[finishIndex] = t(key);
  if (hasColor) {
    const colorIndex = parts.length - 1;
    for (const locale of ['uk', 'en'] as const) {
      const stockSuffix = ` (${getTranslator(locale)('color.madeToOrder')})`;
      if (parts[colorIndex].endsWith(stockSuffix)) {
        parts[colorIndex] = parts[colorIndex].slice(0, -stockSuffix.length) + ` (${t('color.madeToOrder')})`;
        break;
      }
    }
  }
  return parts.join(' · ');
}

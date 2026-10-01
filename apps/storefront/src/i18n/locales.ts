/** Language only. Never infer currency, destination, shipping or payment from this. */
export const SUPPORTED_LOCALES = ['uk', 'en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE = 'uk' satisfies Locale;

/** A supported language is not necessarily translated or published. */
export const PUBLISHED_LOCALES = [DEFAULT_LOCALE, 'en'] as const satisfies readonly Locale[];
export type PublishedLocale = (typeof PUBLISHED_LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: unknown): Locale {
  if (!isLocale(value)) throw new Error(`Unsupported locale: ${String(value)}`);
  return value;
}

export function isPublishedLocale(value: unknown): value is PublishedLocale {
  return typeof value === 'string' && (PUBLISHED_LOCALES as readonly string[]).includes(value);
}

export function assertPublishedLocale(value: unknown): asserts value is PublishedLocale {
  parseLocale(value);
  if (!isPublishedLocale(value)) throw new Error(`Locale is not published: ${String(value)}`);
}

/**
 * Presentation metadata, not a shipping-country or market mapping.
 * Switcher labels are endonyms, identical in every UI language; the short label
 * is never a country code ("UK" reads as the United Kingdom, "UA" is a country).
 */
export const LOCALE_PRESENTATION = {
  uk: { languageTag: 'uk-UA', openGraphLocale: 'uk_UA', shortLabel: 'УКР', nativeName: 'Українська' },
  en: { languageTag: 'en-GB', openGraphLocale: 'en_GB', shortLabel: 'ENG', nativeName: 'English' },
  de: { languageTag: 'de-DE', openGraphLocale: 'de_DE', shortLabel: 'DEU', nativeName: 'Deutsch' },
} as const satisfies Record<Locale, { languageTag: string; openGraphLocale: string; shortLabel: string; nativeName: string }>;

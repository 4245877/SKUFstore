'use client';

import { createContext, useContext } from 'react';
import type { PublishedLocale } from './locales';
import { getTranslator } from './translate';
import { localizeHref } from './paths';

const LocaleContext = createContext<PublishedLocale | null>(null);

/** The static route owns locale. No browser detection or persisted preference. */
export function LocaleProvider({ locale, children }: { locale: PublishedLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): PublishedLocale {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error('Storefront view requires an explicit route locale');
  return locale;
}

export function useI18n() {
  const locale = useLocale();
  return { locale, t: getTranslator(locale), path: (href: string) => localizeHref(locale, href) };
}

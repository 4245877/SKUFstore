import type { Metadata } from 'next';
import { getTranslator, type TranslationKey } from './translate.ts';
import { LOCALE_PRESENTATION, type PublishedLocale } from './locales.ts';
import { buildLocalizedPath } from './paths.ts';

export const SITE_URL = 'https://www.skufnya.com';
export const INDEXABLE_STATIC_PATHS = ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/faq/', '/privacy/', '/terms/', '/user-data-deletion/'];
const PAGE_COPY = {
  "/": [
    "seo.homeTitle",
    "seo.homeDescription"
  ],
  "/catalog/": [
    "shop.productCatalog",
    "seo.description"
  ],
  "/favorites/": [
    "nav.favorites",
    "seo.description"
  ],
  "/cart/": [
    "nav.cart",
    "seo.description"
  ],
  "/checkout/": [
    "nav.checkout",
    "seo.description"
  ],
  "/checkout/success/": [
    "shop.orderPlaced",
    "seo.description"
  ],
  "/checkout/failed/": [
    "checkout.failedTitle",
    "seo.description"
  ],
  "/login/": [
    "auth.signIn",
    "seo.description"
  ],
  "/register/": [
    "auth.createAnAccount",
    "seo.description"
  ],
  "/forgot-password/": [
    "account.passwordHelp",
    "seo.description"
  ],
  "/profile/": [
    "nav.profile",
    "seo.description"
  ],
  "/profile/settings/": [
    "nav.settings",
    "seo.description"
  ],
  "/profile/addresses/": [
    "account.addressHelp",
    "seo.description"
  ],
  "/profile/orders/": [
    "nav.orders",
    "seo.description"
  ],
  "/profile/orders/details/": [
    "account.orderDetails",
    "seo.description"
  ],
  "/verify/": [
    "shop.confirmYouAre18",
    "seo.description"
  ],
  "/delivery/": [
    "nav.delivery",
    "content.weShipAnimeFiguresWithinUkraineThe"
  ],
  "/payment/": [
    "nav.payment",
    "content.paymentIsNotProcessedAutomaticallyOnThe"
  ],
  "/contacts/": [
    "nav.contacts",
    "content.youCanReachUsThroughTelegramOur"
  ],
  "/faq/": [
    "nav.faq",
    "content.answersToCommonQuestionsAboutOrderingProduction"
  ],
  "/privacy/": [
    "content.privacyPolicy",
    "content.skufnyaPrivacyPolicyTheDataWeCollect"
  ],
  "/returns/": [
    "content.returnsAndExchanges",
    "content.returnsMetaDescription"
  ],
  "/terms/": [
    "content.termsOfUse",
    "content.skufnyaTermsOfUseUsingTheWebsite"
  ],
  "/user-data-deletion/": [
    "content.userDataDeletion",
    "content.howSkufnyaUsersCanRequestDeletionOf"
  ]
} as const satisfies Record<string, readonly [TranslationKey, TranslationKey | null]>;

export function languageAlternates(path: string) {
  return Object.fromEntries((['uk', 'en'] as const).map(locale => [locale, SITE_URL + buildLocalizedPath({ locale, path })]));
}

export function rootMetadata(locale: PublishedLocale): Metadata {
  const t = getTranslator(locale);
  return {
    metadataBase: new URL(SITE_URL),
    verification: { google: 'hACTECkBw9QUaRr7jTbTcEKo8tlD68GCGGM6qEFH8bU' },
    title: { default: t('seo.title'), template: '%s | SKUFnya' },
    description: t('seo.description'),
    icons: { icon: '/icon.png' },
    openGraph: { type: 'website', siteName: 'SKUFnya', locale: LOCALE_PRESENTATION[locale].openGraphLocale,
      title: t('seo.socialTitle'), description: t('seo.socialDescription'),
      images: [{ url: `${SITE_URL}/opengraph-image.png`, width: 1200, height: 630, alt: t('seo.imageAlt') }] },
    twitter: { card: 'summary_large_image', title: t('seo.socialTitle'), description: t('seo.twitterDescription'), images: [`${SITE_URL}/opengraph-image.png`] },
  };
}

export function pageMetadata(locale: PublishedLocale, path: string): Metadata {
  const t = getTranslator(locale);
  const copy = PAGE_COPY[path as keyof typeof PAGE_COPY];
  if (!copy) throw new Error(`Missing metadata for route: ${path}`);
  const title = t(copy[0]);
  const description = t(copy[1] || 'seo.description');
  const canonical = SITE_URL + buildLocalizedPath({ locale, path });
  const indexable = INDEXABLE_STATIC_PATHS.includes(path);
  return {
    title, description,
    alternates: { canonical, ...(indexable ? { languages: languageAlternates(path) } : {}) },
    robots: { index: indexable, follow: true },
    openGraph: { ...rootMetadata(locale).openGraph, title, description, url: canonical },
    twitter: { ...rootMetadata(locale).twitter, title, description },
  };
}

import { getTranslator } from '../i18n/translate';
import { DEFAULT_LOCALE, LOCALE_PRESENTATION } from '../i18n/locales';
import type { Metadata } from "next";
import { Manrope, Playfair_Display, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import StoreAnalytics from "../components/StoreAnalytics";

const t = getTranslator(DEFAULT_LOCALE);

// Body-гротеск із повною українською кирилицею та символом ₴ (U+20B4)
const fontSans = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic"],
  style: ["normal", "italic"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
});

// Лише для японських акцентів — українському тексту цей шрифт не призначається
const fontJp = Shippori_Mincho({
  weight: ["400", "600"],
  variable: "--font-jp-serif",
  display: "swap",
  preload: false,
});

const siteUrl = "https://www.skufnya.com";
const ogImageUrl = `${siteUrl}/opengraph-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  verification: {

    google: "hACTECkBw9QUaRr7jTbTcEKo8tlD68GCGGM6qEFH8bU",

  },
  title: {
    default: t('seo.title'),
    template: "%s | SKUFnya",
  },
  description:
    t('seo.description'),
  keywords: [
    t('seo.keywordFigures'),
    t('seo.keywordOriginal'),
    t('seo.keywordCollectibles'),
    "scale figures",
    "Nendoroid",
    "Figma",
    "anime store",
    t('seo.keywordStore'),
    "anime figures",
    "SKUFnya",
  ],
  openGraph: {
    title: t('seo.socialTitle'),
    description:
      t('seo.socialDescription'),
    url: siteUrl,
    siteName: "SKUFnya",
    locale: LOCALE_PRESENTATION[DEFAULT_LOCALE].openGraphLocale,
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: t('seo.imageAlt'),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: t('seo.socialTitle'),
    description:
      t('seo.twitterDescription'),
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${fontSans.variable} ${fontSerif.variable} ${fontJp.variable}`}
    >
      <body>
        <StoreAnalytics />
        <Header locale={DEFAULT_LOCALE} />
        {children}
        <Footer locale={DEFAULT_LOCALE} />
      </body>
    </html>
  );
}
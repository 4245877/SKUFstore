import type { PublishedLocale } from "../../i18n/locales";
import { LocaleProvider } from "../../i18n/client";
import { Manrope, Playfair_Display, Shippori_Mincho } from "next/font/google";
import "../../app/globals.css";
import Header from "./Header";
import Footer from "./Footer";
import StoreAnalytics from "../StoreAnalytics";



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

export default function StorefrontDocument({
  children, locale,
}: Readonly<{ children: React.ReactNode; locale: PublishedLocale }>) {
  return (
    <html
      lang={locale}
      className={`${fontSans.variable} ${fontSerif.variable} ${fontJp.variable}`}
    >
      <body>
        <LocaleProvider locale={locale}>
        <StoreAnalytics />
        <Header locale={locale} />
        {children}
        <Footer locale={locale} />
        </LocaleProvider>
      </body>
    </html>
  );
}
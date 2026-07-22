import type { Metadata } from "next";
import { Manrope, Playfair_Display, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import StoreAnalytics from "../components/StoreAnalytics";

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
    default: "SKUFnya — магазин колекційних фігурок під замовлення.",
    template: "%s | SKUFnya",
  },
  description:
    "Оригінальні аніме-фігурки з ніжною аніме-естетикою: scale, Nendoroid, Figma та колекційні релізи, дбайливо відібрані для тих, хто цінує прекрасне.",
  keywords: [
    "аніме-фігурки",
    "оригінальні аніме-фігурки",
    "колекційні фігурки",
    "scale figures",
    "Nendoroid",
    "Figma",
    "anime store",
    "аніме-магазин",
    "anime figures",
    "SKUFnya",
  ],
  openGraph: {
    title: "SKUFnya — колекціонуй прекрасне",
    description:
      "Світ аніме-естетики, ніжності та оригінальних фігурок. Охайно зібрана колекція для тих, хто цінує витончене.",
    url: siteUrl,
    siteName: "SKUFnya",
    locale: "uk_UA",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "SKUFnya — брендове зображення з аніме-персонажем у maid-естетиці",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SKUFnya — колекціонуй прекрасне",
    description:
      "Ніжна anime-естетика, оригінальні фігурки та дбайливо відібрана колекція для тих, хто цінує прекрасне.",
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uk"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontJp.variable}`}
    >
      <body>
        <StoreAnalytics />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
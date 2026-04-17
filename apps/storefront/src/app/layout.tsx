import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

const siteUrl = "https://4245877.github.io/SKUFstore";
const ogImageUrl = `${siteUrl}/opengraph-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SKUFnya — серйозна полиця, несерйозний вайб",
    template: "%s | SKUFnya",
  },
  description:
    "Магазин аніме-фігурок для дорослих фанатів і колекціонерів: scale, Nendoroid, Figma, лімітовані релізи та вайб спільноти для своїх.",
  keywords: [
    "аніме-фігурки",
    "колекційні фігурки",
    "scale figures",
    "Nendoroid",
    "Figma",
    "anime store",
    "аніме-магазин",
    "колекціонери",
    "best girl",
    "SKUFnya",
  ],
  openGraph: {
    title: "SKUFnya — серйозна полиця, несерйозний вайб",
    description:
      "Аніме-фігурки для дорослого фандому: scale, Nendoroid, Figma, лімітовані релізи й колекційний вайб для своїх.",
    url: siteUrl,
    siteName: "SKUFnya",
    locale: "uk_UA",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "SKUFnya — серйозна полиця, несерйозний вайб",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SKUFnya — серйозна полиця, несерйозний вайб",
    description:
      "Магазин аніме-фігурок для дорослих фанатів і колекціонерів: лімітки, релізи та фандомний вайб для своїх.",
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
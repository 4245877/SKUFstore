import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

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
    <html lang="uk">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { getItalyCatalog } from "@/modules/catalog/server";
import { CatalogProvider } from "@/components/catalog-provider";
import { MainNavigation, SiteHeader } from "@/components/site-shell";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

const display = localFont({
  src: [
    { path: "../../public/fonts/playfair.ttf", style: "normal" },
    { path: "../../public/fonts/playfair-italic.ttf", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});
const sans = localFont({
  src: "../../public/fonts/inter.ttf",
  variable: "--font-sans",
  display: "swap",
});
const mono = localFont({
  src: "../../public/fonts/jetbrains.ttf",
  variable: "--font-mono",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  title: { default: "terreno — A guide to Italy", template: "%s · terreno" },
  description:
    "Italy, Finland and Switzerland. Good places, carefully sourced. Your own pace.",
};
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const catalog = await getItalyCatalog();
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <CatalogProvider catalog={catalog}>
          <SiteHeader />
          {children}
          <MainNavigation mobile />
        </CatalogProvider>
      </body>
    </html>
  );
}

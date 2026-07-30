import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "../../globals.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { fontVariables } from "@/lib/fonts";
import { getSettings, pick } from "@/lib/settings";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const settings = await getSettings();
  const siteName = pick(settings.site.name, locale);

  return {
    title: {
      default: `${pick(settings.seo.defaultTitle, locale)} | ${siteName}`,
      template: `%s | ${siteName}`,
    },
    description: pick(settings.seo.defaultDescription, locale),
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
      : undefined,
    openGraph: {
      siteName,
      locale: locale === "th" ? "th_TH" : "en_US",
      type: "website",
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          {locale === "th" ? "ข้ามไปยังเนื้อหาหลัก" : "Skip to main content"}
        </a>
        <SiteHeader locale={locale as Locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter locale={locale as Locale} />
      </body>
    </html>
  );
}

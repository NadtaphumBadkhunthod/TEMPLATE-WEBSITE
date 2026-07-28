import Link from "next/link";
import { Suspense } from "react";

import { getTranslator } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getSettings, pick } from "@/lib/settings";

import { LanguageSwitcher } from "./LanguageSwitcher";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const settings = await getSettings();

  const links = [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/projects`, label: t("nav.projects") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link
          href={`/${locale}`}
          className="flex min-w-0 items-center gap-2.5 font-semibold text-ink-900"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white"
          >
            {pick(settings.site.name, locale).trim().charAt(0) || "P"}
          </span>
          <span className="truncate">{pick(settings.site.name, locale)}</span>
        </Link>

        <nav
          aria-label={t("nav.menu")}
          className="hidden items-center gap-1 md:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <LanguageSwitcher current={locale} />
          </Suspense>
          {settings.modules.quote && (
            <Link
              href={`/${locale}/quote`}
              className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 sm:inline-block"
            >
              {t("nav.quote")}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav: a simple scrollable row beats a JS drawer at this size. */}
      <nav
        aria-label={t("nav.menu")}
        className="flex gap-1 overflow-x-auto border-t border-ink-200/70 px-4 py-2 md:hidden"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-ink-600"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

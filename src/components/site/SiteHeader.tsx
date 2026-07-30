import Link from "next/link";
import { Suspense } from "react";

import { getTranslator } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getSettings, pick } from "@/lib/settings";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks, type NavLink } from "./NavLinks";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const settings = await getSettings();

  const links: NavLink[] = [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/projects`, label: t("nav.projects") },
  ];

  const siteName = pick(settings.site.name, locale);

  return (
    /*
     * A single clean white bar, sticky, separated by a soft shadow rather than a
     * border — the reference site has no utility strip and no hard rules.
     */
    <header className="sticky top-0 z-40 bg-white/90 shadow-[0_2px_20px_rgb(1_25_185_/_0.07)] backdrop-blur">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link
          href={`/${locale}`}
          className="flex min-w-0 items-center gap-3"
        >
          <span
            aria-hidden
            className="grad-action grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-semibold text-white shadow-[0_6px_20px_rgb(1_25_185_/_0.28)]"
          >
            {siteName.trim().charAt(0) || "N"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight text-ink-900 sm:text-lg">
              {siteName}
            </span>
            <span className="hidden truncate text-xs text-ink-500 sm:block">
              {pick(settings.site.tagline, locale)}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("nav.menu")}
          className="hidden items-center gap-1 md:flex"
        >
          <NavLinks links={links} variant="desktop" />
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher current={locale} />
          </Suspense>
          {settings.modules.quote && (
            <Link
              href={`/${locale}/quote`}
              className="btn btn-primary hidden px-5 py-2.5 text-sm sm:inline-flex"
            >
              {t("nav.quote")}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav: a scrollable pill row beats a JS drawer at this link count. */}
      <nav
        aria-label={t("nav.menu")}
        className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden"
      >
        <NavLinks links={links} variant="mobile" />
      </nav>
    </header>
  );
}

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
    <header className="border-b-4 border-accent-400">
      {/* Utility strip — contact details and language, as on the reference site. */}
      <div className="bg-brand-800 text-white">
        <div className="container-page flex h-10 items-center justify-between gap-4 text-xs">
          <div className="flex min-w-0 items-center gap-5">
            {settings.contact.phone && (
              <a
                href={`tel:${settings.contact.phone.replace(/\s+/g, "")}`}
                className="flex items-center gap-1.5 whitespace-nowrap text-white/85 transition hover:text-accent-400"
              >
                <PhoneIcon />
                <span>{settings.contact.phone}</span>
              </a>
            )}
            {settings.contact.email && (
              <a
                href={`mailto:${settings.contact.email}`}
                className="hidden min-w-0 items-center gap-1.5 text-white/85 transition hover:text-accent-400 sm:flex"
              >
                <MailIcon />
                <span className="truncate">{settings.contact.email}</span>
              </a>
            )}
          </div>
          <Suspense fallback={null}>
            <LanguageSwitcher current={locale} />
          </Suspense>
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-white">
        <div className="container-page flex items-center justify-between gap-6">
          <Link
            href={`/${locale}`}
            className="flex min-w-0 items-center gap-3 py-3"
          >
            <span
              aria-hidden
              className="relative grid size-11 shrink-0 place-items-center bg-brand-700 font-display text-lg font-bold text-white"
            >
              {siteName.trim().charAt(0) || "S"}
              {/* Yellow corner tick — the reference site's accent motif. */}
              <span className="absolute -bottom-1 -right-1 size-3 bg-accent-400" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight text-brand-800 sm:text-lg">
                {siteName}
              </span>
              <span className="hidden truncate text-xs text-ink-500 sm:block">
                {pick(settings.site.tagline, locale)}
              </span>
            </span>
          </Link>

          <nav
            aria-label={t("nav.menu")}
            className="hidden items-stretch md:flex"
          >
            <NavLinks links={links} variant="desktop" />
          </nav>

        </div>
      </div>

      {/* Mobile nav: a scrollable row beats a JS drawer at this link count. */}
      <nav
        aria-label={t("nav.menu")}
        className="flex gap-1 overflow-x-auto border-t border-ink-200 bg-ink-50 px-4 md:hidden"
      >
        <NavLinks links={links} variant="mobile" />
      </nav>
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.9 2.2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

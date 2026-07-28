"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { localeLabels, locales, type Locale } from "@/i18n/config";

/**
 * Swapping the prefix is only correct when the slug is locale-independent.
 * Pages that have per-locale slugs (project detail) pass `alternates` so the
 * switcher lands on the right document instead of a 404.
 */
export function LanguageSwitcher({
  current,
  alternates,
}: {
  current: Locale;
  alternates?: Partial<Record<Locale, string | null>>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(target: Locale): string | null {
    if (alternates && target in alternates) {
      const value = alternates[target];
      return value ?? null;
    }
    const rest = pathname.replace(new RegExp(`^/${current}`), "");
    const query = searchParams.toString();
    return `/${target}${rest}${query ? `?${query}` : ""}`;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((locale) => {
        const href = hrefFor(locale);
        const isActive = locale === current;

        if (isActive) {
          return (
            <span
              key={locale}
              aria-current="true"
              className="rounded-md bg-ink-100 px-2.5 py-1 font-medium text-ink-900"
            >
              {localeLabels[locale]}
            </span>
          );
        }

        if (!href) {
          return (
            <span
              key={locale}
              title="Not available in this language"
              className="cursor-not-allowed rounded-md px-2.5 py-1 text-ink-300"
            >
              {localeLabels[locale]}
            </span>
          );
        }

        return (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            className="rounded-md px-2.5 py-1 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
          >
            {localeLabels[locale]}
          </Link>
        );
      })}
    </div>
  );
}

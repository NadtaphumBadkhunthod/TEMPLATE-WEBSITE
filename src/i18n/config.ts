/**
 * The set of locales the *code* knows how to route. Content locales live in the
 * `locales` table — this list only needs to change if you add URL prefixes.
 */
export const locales = ["th", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "th";

export const localeLabels: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Falls back to the default locale rather than throwing. */
export function toLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

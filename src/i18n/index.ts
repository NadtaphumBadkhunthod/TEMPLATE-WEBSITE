import en from "./messages/en.json";
import th from "./messages/th.json";
import { defaultLocale, type Locale } from "./config";

type Messages = typeof en;

const catalogues: Record<Locale, Messages> = {
  en,
  th: th as Messages,
};

function lookup(source: unknown, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      source,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type Translator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

/**
 * UI strings only. Content translations come from the database — a missing UI
 * string falls back to the default locale, whereas missing *content* is handled
 * by the fallback policy in src/lib/content.ts.
 */
export function getTranslator(locale: Locale): Translator {
  const primary = catalogues[locale] ?? catalogues[defaultLocale];
  const fallback = catalogues[defaultLocale];

  return (key, vars) => {
    const message = lookup(primary, key) ?? lookup(fallback, key) ?? key;
    return interpolate(message, vars);
  };
}

export { defaultLocale };
export type { Locale };

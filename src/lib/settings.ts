import { cache } from "react";

import { loadSettingsFile } from "./data";
import type { Locale } from "@/i18n/config";

/** A string that exists in every content locale. */
export type LocalisedString = Record<string, string>;

export type SiteSettings = {
  site: {
    name: LocalisedString;
    tagline: LocalisedString;
  };
  hero: {
    title: LocalisedString;
    subtitle: LocalisedString;
    ctaLabel: LocalisedString;
  };
  contact: {
    email: string;
    phone: string;
    address: LocalisedString;
  };
  seo: {
    defaultTitle: LocalisedString;
    defaultDescription: LocalisedString;
  };
  i18n: {
    /** 'hide' = 404 untranslated content; 'fallback' = show default locale. */
    contentFallback: "hide" | "fallback";
  };
};

export const defaultSettings: SiteSettings = {
  site: {
    name: { th: "ศูนย์วิจัยเมืองอัจฉริยะ", en: "Smart City Research Center" },
    tagline: {
      th: "งานวิจัยและโครงการของเรา",
      en: "Our research and projects",
    },
  },
  hero: {
    title: {
      th: "โซลูชันเมืองอัจฉริยะที่ใช้งานได้จริง",
      en: "Smart city solutions that actually ship",
    },
    subtitle: {
      th: "เราออกแบบ ติดตั้ง และดูแลระบบตั้งแต่ต้นจนจบ",
      en: "We design, deploy and maintain systems end to end.",
    },
    ctaLabel: { th: "ดูผลงานของเรา", en: "See our work" },
  },
  contact: {
    email: "hello@example.com",
    phone: "+66 2 000 0000",
    address: { th: "กรุงเทพมหานคร ประเทศไทย", en: "Bangkok, Thailand" },
  },
  seo: {
    defaultTitle: { th: "ผลงานของเรา", en: "Our Projects" },
    defaultDescription: {
      th: "รวมผลงานและโซลูชันที่เราออกแบบและติดตั้ง",
      en: "A portfolio of the solutions we design and deploy.",
    },
  },
  i18n: {
    contentFallback: "fallback",
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deep-merges the file over the defaults so a partial settings.json is fine. */
function merge<T>(base: T, override: unknown): T {
  if (!isPlainObject(override) || !isPlainObject(base)) {
    return override === undefined ? base : (override as T);
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in base ? merge((base as never)[key], value) : value;
  }
  return result as T;
}

/**
 * Cached per request. Settings are read on nearly every page, so this keeps it
 * to one file read per render rather than one per component.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const stored = await loadSettingsFile();

  let settings = defaultSettings;
  for (const [group, value] of Object.entries(stored)) {
    if (group in settings) {
      settings = {
        ...settings,
        [group]: merge((settings as Record<string, unknown>)[group], value),
      };
    }
  }
  return settings;
});

/** Picks the right language out of a LocalisedString, with a sane fallback. */
export function pick(
  value: LocalisedString | undefined,
  locale: Locale,
  fallbackLocale = "th",
): string {
  if (!value) return "";
  return value[locale] ?? value[fallbackLocale] ?? Object.values(value)[0] ?? "";
}

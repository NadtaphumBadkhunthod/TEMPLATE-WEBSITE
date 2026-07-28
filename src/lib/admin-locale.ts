import { cookies } from "next/headers";

import { toLocale, type Locale } from "@/i18n/config";

export const ADMIN_LOCALE_COOKIE = "admin_locale";

/**
 * The admin UI language is independent of the content language — an editor may
 * work in Thai while editing the English translation of a project.
 */
export async function getAdminLocale(): Promise<Locale> {
  const store = await cookies();
  return toLocale(store.get(ADMIN_LOCALE_COOKIE)?.value);
}

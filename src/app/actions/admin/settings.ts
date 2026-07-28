"use server";

import { revalidatePath } from "next/cache";

import { locales } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { saveSettingGroup, type LocalisedString } from "@/lib/settings";
import type { SettingsState } from "@/lib/action-state";

function localised(formData: FormData, prefix: string): LocalisedString {
  const value: LocalisedString = {};
  for (const locale of locales) {
    value[locale] = String(formData.get(`${prefix}_${locale}`) ?? "").trim();
  }
  return value;
}

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();

  try {
    await saveSettingGroup("site", {
      name: localised(formData, "site_name"),
      tagline: localised(formData, "site_tagline"),
    });

    await saveSettingGroup("hero", {
      title: localised(formData, "hero_title"),
      subtitle: localised(formData, "hero_subtitle"),
      ctaLabel: localised(formData, "hero_cta"),
    });

    await saveSettingGroup("contact", {
      email: String(formData.get("contact_email") ?? "").trim(),
      phone: String(formData.get("contact_phone") ?? "").trim(),
      address: localised(formData, "contact_address"),
    });

    await saveSettingGroup("modules", {
      quote: formData.get("module_quote") === "on",
    });

    await saveSettingGroup("seo", {
      defaultTitle: localised(formData, "seo_title"),
      defaultDescription: localised(formData, "seo_description"),
    });

    await saveSettingGroup("i18n", {
      contentFallback:
        String(formData.get("content_fallback") ?? "fallback") === "hide"
          ? "hide"
          : "fallback",
    });

    await saveSettingGroup("quote", {
      notifyEmails: String(formData.get("notify_emails") ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
  } catch {
    return { ok: false, error: "Could not save settings." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, error: null };
}

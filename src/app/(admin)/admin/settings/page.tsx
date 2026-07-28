import { SettingsForm } from "@/components/admin/SettingsForm";
import { getTranslator } from "@/i18n";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);
  const settings = await getSettings();

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">
        {t("admin.settings")}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        These values drive the public site. Turning a module off removes its
        pages and navigation entries entirely.
      </p>

      <SettingsForm settings={settings} />
    </div>
  );
}

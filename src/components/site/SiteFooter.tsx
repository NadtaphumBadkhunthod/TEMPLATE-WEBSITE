import Link from "next/link";

import { getTranslator } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getSettings, pick } from "@/lib/settings";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const settings = await getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-ink-200 bg-ink-50">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-semibold text-ink-900">
            {pick(settings.site.name, locale)}
          </p>
          <p className="mt-2 max-w-xs text-sm text-ink-500">
            {pick(settings.site.tagline, locale)}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-900">
            {t("footer.quickLinks")}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>
              <Link href={`/${locale}/projects`} className="hover:text-brand-700">
                {t("nav.projects")}
              </Link>
            </li>
            {settings.modules.pricing && (
              <li>
                <Link
                  href={`/${locale}/pricing`}
                  className="hover:text-brand-700"
                >
                  {t("nav.pricing")}
                </Link>
              </li>
            )}
            {settings.modules.quote && (
              <li>
                <Link href={`/${locale}/quote`} className="hover:text-brand-700">
                  {t("nav.quote")}
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-900">
            {t("footer.contact")}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {settings.contact.email && (
              <li>
                <a
                  href={`mailto:${settings.contact.email}`}
                  className="hover:text-brand-700"
                >
                  {settings.contact.email}
                </a>
              </li>
            )}
            {settings.contact.phone && (
              <li>
                <a
                  href={`tel:${settings.contact.phone.replace(/\s+/g, "")}`}
                  className="hover:text-brand-700"
                >
                  {settings.contact.phone}
                </a>
              </li>
            )}
            <li className="text-ink-500">
              {pick(settings.contact.address, locale)}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-200">
        <div className="container-page py-5 text-xs text-ink-500">
          © {year} {pick(settings.site.name, locale)}. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}

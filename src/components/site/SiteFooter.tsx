import Link from "next/link";

import { getTranslator } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getSettings, pick } from "@/lib/settings";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const siteName = pick(settings.site.name, locale);

  return (
    <footer className="mt-24 bg-brand-800 text-white">
      <div className="h-1 bg-accent-400" />

      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="relative grid size-10 shrink-0 place-items-center bg-white/10 font-display text-base font-bold text-white"
            >
              {siteName.trim().charAt(0) || "S"}
              <span className="absolute -bottom-1 -right-1 size-2.5 bg-accent-400" />
            </span>
            <p className="font-display text-lg font-semibold text-white">
              {siteName}
            </p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            {pick(settings.site.tagline, locale)}
          </p>
        </div>

        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-400">
            {t("footer.quickLinks")}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li>
              <Link
                href={`/${locale}`}
                className="transition hover:text-accent-400"
              >
                {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/projects`}
                className="transition hover:text-accent-400"
              >
                {t("nav.projects")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-400">
            {t("footer.contact")}
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {pick(settings.contact.address, locale) && (
              <li className="flex gap-2.5">
                <PinIcon />
                <span className="leading-relaxed">
                  {pick(settings.contact.address, locale)}
                </span>
              </li>
            )}
            {settings.contact.phone && (
              <li className="flex gap-2.5">
                <PhoneIcon />
                <a
                  href={`tel:${settings.contact.phone.replace(/\s+/g, "")}`}
                  className="transition hover:text-accent-400"
                >
                  {settings.contact.phone}
                </a>
              </li>
            )}
            {settings.contact.email && (
              <li className="flex min-w-0 gap-2.5">
                <MailIcon />
                <a
                  href={`mailto:${settings.contact.email}`}
                  className="truncate transition hover:text-accent-400"
                >
                  {settings.contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container-page py-5 text-xs text-white/60">
          © {year} {siteName}. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}

function iconProps() {
  return {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
    className: "mt-0.5 shrink-0 text-accent-400",
  };
}

function PinIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.9 2.2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

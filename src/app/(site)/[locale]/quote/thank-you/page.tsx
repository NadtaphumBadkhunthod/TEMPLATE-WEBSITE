import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslator } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getTranslator(locale);

  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-lg text-center">
        <div
          aria-hidden
          className="grad-action mx-auto grid size-14 place-items-center rounded-[--radius-pill] text-2xl font-semibold text-white"
        >
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-bold">{t("thankYou.title")}</h1>
        <div
          aria-hidden
          className="grad-action mx-auto mt-5 h-1 w-14 rounded-[--radius-pill]"
        />
        <p className="mt-5 text-ink-500">{t("thankYou.body")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="btn btn-primary px-5 py-2.5 text-sm"
          >
            {t("thankYou.backHome")}
          </Link>
          <Link
            href={`/${locale}/projects`}
            className="btn btn-outline px-5 py-2.5 text-sm"
          >
            {t("thankYou.browseProjects")}
          </Link>
        </div>
      </div>
    </div>
  );
}

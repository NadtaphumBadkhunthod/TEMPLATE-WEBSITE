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
          className="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-2xl text-brand-700"
        >
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">
          {t("thankYou.title")}
        </h1>
        <p className="mt-3 text-ink-500">{t("thankYou.body")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            {t("thankYou.backHome")}
          </Link>
          <Link
            href={`/${locale}/projects`}
            className="rounded-lg border border-ink-300 px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:border-brand-400"
          >
            {t("thankYou.browseProjects")}
          </Link>
        </div>
      </div>
    </div>
  );
}

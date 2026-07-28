import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslator } from "@/i18n";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)("pricing.title") };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const settings = await getSettings();
  // The pricing module is optional — when off, the page does not exist at all
  // rather than rendering an empty shell.
  if (!settings.modules.pricing) notFound();

  const t = getTranslator(locale);

  const plans = await db.pricingPlan.findMany({
    where: { isActive: true },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="container-page py-16">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {t("pricing.title")}
        </h1>
        <p className="mt-3 text-ink-500">{t("pricing.subtitle")}</p>
      </header>

      {plans.length === 0 ? (
        <p className="mt-16 text-center text-ink-500">{t("pricing.empty")}</p>
      ) : (
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const tr =
              plan.translations.find((x) => x.locale === locale) ??
              plan.translations.find((x) => x.locale === defaultLocale) ??
              plan.translations[0];
            if (!tr) return null;

            const features = Array.isArray(tr.features)
              ? (tr.features as { text?: string; included?: boolean }[])
              : [];

            const amount =
              plan.priceAmount === null ? null : Number(plan.priceAmount);

            const periodLabel =
              plan.billingPeriod === "monthly"
                ? t("pricing.perMonth")
                : plan.billingPeriod === "yearly"
                  ? t("pricing.perYear")
                  : plan.billingPeriod === "one_time"
                    ? ` ${t("pricing.oneTime")}`
                    : "";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-[--radius-card] border bg-white p-7 ${
                  plan.isFeatured
                    ? "border-brand-500 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500"
                    : "border-ink-200"
                }`}
              >
                {plan.isFeatured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
                    {t("pricing.mostPopular")}
                  </span>
                )}

                <h2 className="text-lg font-semibold text-ink-900">{tr.name}</h2>
                {tr.tagline && (
                  <p className="mt-1.5 text-sm text-ink-500">{tr.tagline}</p>
                )}

                <p className="mt-6">
                  {plan.priceDisplayMode === "on_request" || amount === null ? (
                    <span className="text-2xl font-bold text-ink-900">
                      {t("project.priceOnRequest")}
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-ink-900">
                        {plan.priceDisplayMode === "from"
                          ? t("project.priceFrom", {
                              amount: formatMoney(
                                amount,
                                plan.priceCurrency,
                                locale,
                              ),
                            })
                          : formatMoney(amount, plan.priceCurrency, locale)}
                      </span>
                      {periodLabel && (
                        <span className="text-sm text-ink-500">
                          {periodLabel}
                        </span>
                      )}
                    </>
                  )}
                </p>

                {features.length > 0 && (
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {features.map((feature, index) => (
                      <li
                        key={index}
                        className={`flex gap-2.5 ${
                          feature.included === false
                            ? "text-ink-400 line-through"
                            : "text-ink-700"
                        }`}
                      >
                        <span aria-hidden className="text-brand-600">
                          {feature.included === false ? "–" : "✓"}
                        </span>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={tr.ctaUrl || `/${locale}/quote`}
                  className={`mt-8 block rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                    plan.isFeatured
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-ink-300 text-ink-700 hover:border-brand-400 hover:text-brand-700"
                  }`}
                >
                  {tr.ctaLabel || t("pricing.contactUs")}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

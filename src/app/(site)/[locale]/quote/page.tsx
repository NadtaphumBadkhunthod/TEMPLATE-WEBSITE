import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuoteForm } from "@/components/site/QuoteForm";
import { getTranslator } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { getProjects } from "@/lib/content";
import { QUOTE_FORM_KEY, getForm } from "@/lib/forms";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getTranslator(locale)("quote.title") };
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const t = getTranslator(locale);
  const settings = await getSettings();
  if (!settings.modules.quote) notFound();

  const query = await searchParams;
  const preselected =
    typeof query.project === "string" ? query.project : "";

  const [form, projects] = await Promise.all([
    getForm(QUOTE_FORM_KEY, locale),
    getProjects(locale, { limit: 200 }),
  ]);

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl">
        <header>
          <div className="heading-rule">
            <h1 className="text-3xl font-bold sm:text-4xl">
              {t("quote.title")}
            </h1>
          </div>
          <p className="mt-5 text-ink-500">{t("quote.subtitle")}</p>
        </header>

        <div className="mt-10 border-t-4 border-accent-400 border-x border-b border-x-ink-200 border-b-ink-200 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(23,59,107,0.4)] sm:p-8">
          {form && form.fields.length > 0 ? (
            <QuoteForm
              locale={locale}
              fields={form.fields}
              projects={projects.items.map((p) => ({
                slug: p.slug,
                title: p.title,
              }))}
              selectedProject={preselected}
              labels={{
                submit: t("quote.submit"),
                submitting: t("quote.submitting"),
                projectOfInterest: t("quote.projectOfInterest"),
                generalEnquiry: t("quote.generalEnquiry"),
                required: t("common.required"),
              }}
            />
          ) : (
            <p className="text-sm text-ink-500">{t("quote.unavailable")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

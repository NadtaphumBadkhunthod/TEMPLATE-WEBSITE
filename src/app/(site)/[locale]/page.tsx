import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryFilter } from "@/components/site/CategoryFilter";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getTranslator } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { getCategoriesWithCounts, getProjects } from "@/lib/content";
import { getSettings, pick } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const t = getTranslator(locale);
  const settings = await getSettings();

  const [featured, categories] = await Promise.all([
    getProjects(locale, { featuredOnly: true, limit: 3 }),
    getCategoriesWithCounts(locale),
  ]);

  // Fall back to the newest projects when nothing has been flagged as featured,
  // so a fresh install never shows an empty homepage.
  const highlights = featured.items.length
    ? featured.items
    : (await getProjects(locale, { limit: 3 })).items;

  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="container-page py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              {pick(settings.hero.title, locale)}
            </h1>
            <p className="mt-5 text-lg text-ink-600">
              {pick(settings.hero.subtitle, locale)}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/projects`}
                className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
              >
                {pick(settings.hero.ctaLabel, locale)}
              </Link>
              {settings.modules.quote && (
                <Link
                  href={`/${locale}/quote`}
                  className="rounded-lg border border-ink-300 bg-white px-6 py-3 font-medium text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
                >
                  {t("nav.quote")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="container-page py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
                {t("home.featuredTitle")}
              </h2>
              <p className="mt-2 text-ink-500">{t("home.featuredSubtitle")}</p>
            </div>
            <Link
              href={`/${locale}/projects`}
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {t("home.viewAll")} →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((project) => (
              <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="border-y border-ink-200 bg-ink-50">
          <div className="container-page py-16">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              {t("home.categoriesTitle")}
            </h2>
            <p className="mt-2 text-ink-500">{t("home.categoriesSubtitle")}</p>
            <div className="mt-6">
              <CategoryFilter
                categories={categories}
                selected={[]}
                basePath={`/${locale}/projects`}
                t={t}
              />
            </div>
          </div>
        </section>
      )}

      {settings.modules.quote && (
        <section className="container-page py-20">
          <div className="rounded-2xl bg-ink-900 px-8 py-14 text-center sm:px-16">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {t("home.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-300">
              {t("home.ctaBody")}
            </p>
            <Link
              href={`/${locale}/quote`}
              className="mt-8 inline-block rounded-lg bg-brand-500 px-6 py-3 font-medium text-white transition hover:bg-brand-400"
            >
              {t("home.ctaButton")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

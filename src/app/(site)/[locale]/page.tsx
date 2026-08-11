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
      {/*
        Dark banner hero. The reference site uses a cityscape photo behind a navy
        scrim; there is no site-wide hero image in settings yet, so this builds
        the same depth from gradients — it reads as deliberate rather than as a
        missing image, and swapping in a photo later means one background rule.
      */}
      <section className="relative isolate overflow-hidden bg-brand-800">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top right, rgba(47,95,151,0.55), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="container-page py-20 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-block bg-accent-400 px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider text-brand-800">
              {pick(settings.site.name, locale)}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              {pick(settings.hero.title, locale)}
            </h1>
            <div aria-hidden className="mt-6 h-1 w-20 bg-accent-400" />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              {pick(settings.hero.subtitle, locale)}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/projects`}
                className="btn btn-accent"
              >
                {pick(settings.hero.ctaLabel, locale)}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="container-page py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="heading-rule">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {t("home.featuredTitle")}
                </h2>
              </div>
              <p className="mt-4 text-ink-500">{t("home.featuredSubtitle")}</p>
            </div>
            <Link
              href={`/${locale}/projects`}
              className="group text-sm font-semibold text-brand-700 transition hover:text-brand-800"
            >
              {t("home.viewAll")}{" "}
              <span className="inline-block transition group-hover:translate-x-1">
                →
              </span>
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
        <section className="band-tint border-y border-ink-200">
          <div className="container-page py-16">
            <div className="heading-rule">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {t("home.categoriesTitle")}
              </h2>
            </div>
            <p className="mt-4 text-ink-500">{t("home.categoriesSubtitle")}</p>
            <div className="mt-7">
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

    </>
  );
}

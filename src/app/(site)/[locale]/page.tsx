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
        Gradient banner hero — the reference site's blue→cyan→teal run at 135°.
        A soft radial highlight and a faint dot grid sit on top for depth, so it
        reads as deliberate rather than as a missing photo; dropping a real image
        in later is one background rule on the section.
      */}
      <section className="grad-brand-text relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top right, rgba(255,255,255,0.28), transparent 62%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1.1px, transparent 1.1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="container-page py-20 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-block rounded-[--radius-pill] bg-white/15 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white ring-1 ring-inset ring-white/30 backdrop-blur">
              {pick(settings.site.name, locale)}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {pick(settings.hero.title, locale)}
            </h1>
            <div
              aria-hidden
              className="mt-6 h-1 w-20 rounded-[--radius-pill] bg-white/85"
            />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90">
              {pick(settings.hero.subtitle, locale)}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/${locale}/projects`} className="btn btn-accent">
                {pick(settings.hero.ctaLabel, locale)}
              </Link>
              {settings.modules.quote && (
                <Link
                  href={`/${locale}/quote`}
                  className="btn btn-outline-light"
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
        <section className="band-tint">
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

      {settings.modules.quote && (
        <section className="container-page py-20">
          {/* A rounded gradient panel rather than a full-bleed band, which is how
              the reference site frames its registration call to action. */}
          <div className="grad-brand-text shadow-lifted relative isolate overflow-hidden rounded-[2rem] px-8 py-14 text-center sm:px-16">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at bottom left, rgba(255,255,255,0.22), transparent 62%)",
              }}
            />
            <div className="heading-rule heading-rule-center heading-rule-light">
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                {t("home.ctaTitle")}
              </h2>
            </div>
            <p className="mx-auto mt-5 max-w-xl text-white/80">
              {t("home.ctaBody")}
            </p>
            <Link href={`/${locale}/quote`} className="btn btn-accent mt-8">
              {t("home.ctaButton")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

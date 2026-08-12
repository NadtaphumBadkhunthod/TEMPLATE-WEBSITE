import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AttachmentList } from "@/components/site/AttachmentList";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import { BrochureViewer } from "@/components/site/BrochureViewer";
import { Gallery } from "@/components/site/Gallery";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getTranslator } from "@/i18n";
import { isLocale, locales, type Locale } from "@/i18n/config";
import {
  getProjectBySlug,
  getProjectSlugMap,
  getRelatedProjects,
} from "@/lib/content";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const t = getTranslator(locale);
  const project = await getProjectBySlug(locale, slug, t);
  if (!project) return {};

  const alternates = await slugAlternates(project.id);

  return {
    title: project.seoTitle || project.title,
    description: project.seoDescription || project.summary || undefined,
    alternates: {
      canonical: `/${locale}/projects/${project.slug}`,
      languages: Object.fromEntries(
        Object.entries(alternates)
          .filter(([, value]) => value)
          .map(([code, value]) => [code, `/${code}/projects/${value}`]),
      ),
    },
  };
}

/** Per-locale slugs, so hreflang and the switcher point at the right document. */
async function slugAlternates(projectId: string) {
  const slugs = await getProjectSlugMap(projectId);
  const map: Partial<Record<Locale, string>> = {};
  for (const [locale, slug] of Object.entries(slugs)) {
    if (isLocale(locale)) map[locale] = slug;
  }
  return map;
}

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const t = getTranslator(locale);
  const project = await getProjectBySlug(locale, slug, t);
  if (!project) notFound();

  const [related, alternates] = await Promise.all([
    getRelatedProjects(locale, project),
    slugAlternates(project.id),
  ]);

  const switcherAlternates = Object.fromEntries(
    locales.map((code) => [
      code,
      alternates[code] ? `/${code}/projects/${alternates[code]}` : null,
    ]),
  ) as Partial<Record<Locale, string | null>>;

  return (
    <article className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/${locale}/projects`}
          className="text-sm font-medium text-ink-500 hover:text-brand-700"
        >
          ← {t("project.backToList")}
        </Link>
        <Suspense fallback={null}>
          <LanguageSwitcher current={locale} alternates={switcherAlternates} />
        </Suspense>
      </div>

      {!project.isTranslated && (
        <p className="mt-6 border-l-[3px] border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("project.notTranslated")}
        </p>
      )}

      <header className="mt-6 max-w-3xl">
        {project.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.categories.map((category) => (
              <Link
                key={category.id}
                href={`/${locale}/projects?category=${encodeURIComponent(category.slug)}`}
                className="bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{project.title}</h1>
        <div
          aria-hidden
          className="grad-action mt-5 h-1 w-14 rounded-[--radius-pill]"
        />
        {project.summary && (
          <p className="mt-5 text-lg leading-relaxed text-ink-600">
            {project.summary}
          </p>
        )}
      </header>

      <div className="mt-10">
        <div className="min-w-0">
          {project.gallery.length > 0 && (
            <div className="mb-10">
              <Gallery images={project.gallery} />
            </div>
          )}

          {/*
            The admin picks how this project reads: typed text, an uploaded
            brochure, or the brochure followed by the text. `infoDisplay` has
            already been downgraded to "text" upstream if no brochure exists, so
            there is no empty-page case to guard here.
          */}
          {project.brochure && project.infoDisplay !== "text" && (
            <section>
              <div className="heading-rule">
                <h2 className="text-xl font-semibold">
                  {t("project.brochure")}
                </h2>
              </div>
              <div className="mt-5">
                <BrochureViewer brochure={project.brochure} t={t} />
              </div>
            </section>
          )}

          {project.infoDisplay !== "brochure" && project.body.length > 0 && (
            <section
              className={project.infoDisplay === "both" ? "mt-10" : undefined}
            >
              <div className="heading-rule">
                <h2 className="text-xl font-semibold">
                  {t("project.overview")}
                </h2>
              </div>
              <div className="mt-5">
                <BlockRenderer blocks={project.body} />
              </div>
            </section>
          )}

          {/* The feature list is typed copy too, so it follows the same rule. */}
          {project.infoDisplay !== "brochure" && project.features.length > 0 && (
            <section className="mt-10">
              <div className="heading-rule">
                <h2 className="text-xl font-semibold">
                  {t("project.features")}
                </h2>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {project.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-[--radius-card] border-l-4 border-aqua-500 bg-ink-50 p-4 text-sm text-ink-700"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 font-bold text-brand-600"
                    >
                      ✓
                    </span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.specs.length > 0 && (
            <section className="mt-10">
              <div className="heading-rule">
                <h2 className="text-xl font-semibold">
                  {t("project.specifications")}
                </h2>
              </div>
              <dl className="mt-5 divide-y divide-ink-200 border border-ink-200">
                {project.specs.map((spec) => (
                  <div
                    key={spec.key}
                    className="flex flex-wrap gap-2 px-4 py-3 text-sm"
                  >
                    <dt className="w-48 shrink-0 font-medium text-ink-500">
                      {spec.label}
                    </dt>
                    <dd className="text-ink-800">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/*
            Downloads live in the main column rather than the sidebar: they are a
            headline feature of a project page, and audio/video players need the
            width.
          */}
          {project.attachments.length > 0 && (
            <section className="mt-10">
              <div className="heading-rule">
                <h2 className="text-xl font-semibold">
                  {t("project.attachments")}
                </h2>
              </div>
              <AttachmentList groups={project.attachmentGroups} t={t} />
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 border-t border-ink-200 pt-12">
          <div className="heading-rule">
            <h2 className="text-2xl font-bold">{t("project.related")}</h2>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProjectCard key={item.id} project={item} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

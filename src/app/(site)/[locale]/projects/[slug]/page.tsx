import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BlockRenderer } from "@/components/site/BlockRenderer";
import { Gallery } from "@/components/site/Gallery";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getTranslator } from "@/i18n";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import {
  getProjectBySlug,
  getRelatedProjects,
  type ProjectDetail,
} from "@/lib/content";
import { formatFileSize } from "@/lib/format";
import { getSettings } from "@/lib/settings";

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
  const rows = await db.projectTranslation.findMany({
    where: { projectId, isPublished: true },
    select: { locale: true, slug: true },
  });
  const map: Partial<Record<Locale, string>> = {};
  for (const row of rows) {
    if (isLocale(row.locale)) map[row.locale] = row.slug;
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

  const settings = await getSettings();
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
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {project.title}
        </h1>
        {project.summary && (
          <p className="mt-4 text-lg text-ink-600">{project.summary}</p>
        )}
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {project.gallery.length > 0 && (
            <div className="mb-10">
              <Gallery images={project.gallery} />
            </div>
          )}

          {project.body.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-ink-900">
                {t("project.overview")}
              </h2>
              <div className="mt-3">
                <BlockRenderer blocks={project.body} />
              </div>
            </section>
          )}

          {project.features.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-ink-900">
                {t("project.features")}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {project.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-lg border border-ink-200 bg-ink-50/60 p-4 text-sm text-ink-700"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-brand-600"
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
              <h2 className="text-xl font-semibold text-ink-900">
                {t("project.specifications")}
              </h2>
              <dl className="mt-4 divide-y divide-ink-200 rounded-lg border border-ink-200">
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
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {settings.modules.quote && (
            <EnquiryCard project={project} locale={locale} t={t} />
          )}

          {project.attachments.length > 0 && (
            <section className="rounded-[--radius-card] border border-ink-200 p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                {t("project.attachments")}
              </h2>
              <ul className="mt-3 space-y-2">
                {project.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target={file.isExternal ? "_blank" : undefined}
                      rel={file.isExternal ? "noopener noreferrer" : undefined}
                      download={file.isExternal ? undefined : ""}
                      className="flex items-center gap-3 rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
                    >
                      <span aria-hidden className="text-ink-400">
                        {file.isExternal ? "↗" : "↓"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {file.label}
                      </span>
                      {file.sizeBytes ? (
                        <span className="shrink-0 text-xs text-ink-400">
                          {formatFileSize(file.sizeBytes)}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-20 border-t border-ink-200 pt-12">
          <h2 className="text-2xl font-bold text-ink-900">
            {t("project.related")}
          </h2>
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

function EnquiryCard({
  project,
  locale,
  t,
}: {
  project: ProjectDetail;
  locale: Locale;
  t: ReturnType<typeof getTranslator>;
}) {
  return (
    <div className="rounded-[--radius-card] border border-ink-200 bg-ink-50/60 p-5">
      <p className="text-base font-semibold text-ink-900">
        {t("project.enquiry")}
      </p>
      <p className="mt-1 text-sm text-ink-500">{t("project.enquiryBody")}</p>

      <Link
        href={`/${locale}/quote?project=${encodeURIComponent(project.slug)}`}
        className="mt-4 block rounded-lg bg-brand-600 px-4 py-3 text-center font-medium text-white transition hover:bg-brand-700"
      >
        {t("project.requestQuote")}
      </Link>
    </div>
  );
}

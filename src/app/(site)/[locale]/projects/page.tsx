import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryFilter } from "@/components/site/CategoryFilter";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getTranslator } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { getCategoriesWithCounts, getProjects } from "@/lib/content";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return { title: t("projects.title") };
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const query = await searchParams;
  const t = getTranslator(locale);

  const selected = toArray(query.category);
  const sortParam = typeof query.sort === "string" ? query.sort : "newest";
  const sort =
    sortParam === "name" || sortParam === "oldest" ? sortParam : "newest";
  const page = Number.parseInt(
    typeof query.page === "string" ? query.page : "1",
    10,
  );

  const [categories, result] = await Promise.all([
    getCategoriesWithCounts(locale),
    getProjects(locale, {
      categorySlugs: selected,
      sort,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      perPage: 9,
    }),
  ]);

  const basePath = `/${locale}/projects`;

  function pageHref(target: number) {
    const params = new URLSearchParams();
    for (const slug of selected) params.append("category", slug);
    if (sort !== "newest") params.set("sort", sort);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const currentPage = Math.min(
    Math.max(1, Number.isFinite(page) ? page : 1),
    result.pages,
  );

  return (
    <div className="container-page py-14">
      <header className="max-w-2xl">
        <div className="heading-rule">
          <h1 className="text-3xl font-bold sm:text-4xl">
            {t("projects.title")}
          </h1>
        </div>
        <p className="mt-5 text-ink-500">{t("projects.subtitle")}</p>
      </header>

      {categories.length > 0 && (
        <div className="mt-8">
          <CategoryFilter
            categories={categories}
            selected={selected}
            basePath={basePath}
            t={t}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4 text-sm">
        <p className="text-ink-500">
          {t(
            result.total === 1
              ? "projects.resultCount"
              : "projects.resultCountPlural",
            { count: result.total },
          )}
        </p>

        <div className="flex items-center gap-1">
          {(["newest", "name"] as const).map((option) => {
            const params = new URLSearchParams();
            for (const slug of selected) params.append("category", slug);
            if (option !== "newest") params.set("sort", option);
            const qs = params.toString();
            return (
              <Link
                key={option}
                href={qs ? `${basePath}?${qs}` : basePath}
                aria-current={sort === option}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  sort === option
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-500 hover:text-ink-800"
                }`}
              >
                {t(
                  option === "newest"
                    ? "projects.sortNewest"
                    : "projects.sortName",
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {result.items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-ink-500">{t("projects.noResults")}</p>
          {selected.length > 0 && (
            <Link
              href={basePath}
              className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {t("projects.clearFilters")}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((project) => (
            <ProjectCard key={project.id} project={project} locale={locale} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-center gap-3 text-sm"
        >
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1)}
              className="rounded-lg border border-ink-200 px-4 py-2 font-medium text-ink-700 hover:border-brand-300"
            >
              ← {t("projects.previous")}
            </Link>
          ) : (
            <span className="rounded-lg border border-ink-100 px-4 py-2 text-ink-500">
              ← {t("projects.previous")}
            </span>
          )}

          <span className="text-ink-500">
            {t("projects.page", {
              current: currentPage,
              total: result.pages,
            })}
          </span>

          {currentPage < result.pages ? (
            <Link
              href={pageHref(currentPage + 1)}
              className="rounded-lg border border-ink-200 px-4 py-2 font-medium text-ink-700 hover:border-brand-300"
            >
              {t("projects.next")} →
            </Link>
          ) : (
            <span className="rounded-lg border border-ink-100 px-4 py-2 text-ink-500">
              {t("projects.next")} →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

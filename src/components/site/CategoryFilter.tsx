import Link from "next/link";

import type { CategoryView } from "@/lib/content";
import type { Translator } from "@/i18n";

/**
 * Link-based rather than JS-driven: filters stay shareable, crawlable and work
 * without hydration. Selecting a category toggles it in the query string.
 */
export function CategoryFilter({
  categories,
  selected,
  basePath,
  t,
}: {
  categories: CategoryView[];
  selected: string[];
  basePath: string;
  t: Translator;
}) {
  function hrefWith(slugs: string[]) {
    if (!slugs.length) return basePath;
    const params = new URLSearchParams();
    for (const slug of slugs) params.append("category", slug);
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav aria-label={t("projects.filterByCategory")} className="flex flex-wrap gap-2">
      <Link
        href={hrefWith([])}
        aria-current={selected.length === 0}
        className={`rounded-[--radius-pill] px-4 py-2 text-sm font-medium transition ${
          selected.length === 0
            ? "grad-action text-white shadow-[0_6px_20px_rgb(1_25_185_/_0.25)]"
            : "bg-ink-50 text-ink-600 hover:bg-brand-50 hover:text-brand-700"
        }`}
      >
        {t("projects.allCategories")}
      </Link>

      {categories.map((category) => {
        const isSelected = selected.includes(category.slug);
        const next = isSelected
          ? selected.filter((slug) => slug !== category.slug)
          : [...selected, category.slug];

        return (
          <Link
            key={category.id}
            href={hrefWith(next)}
            aria-current={isSelected}
            className={`rounded-[--radius-pill] px-4 py-2 text-sm font-medium transition ${
              isSelected
                ? "grad-action text-white shadow-[0_6px_20px_rgb(1_25_185_/_0.25)]"
                : "bg-ink-50 text-ink-600 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {category.name}
            <span
              className={`ml-1.5 text-xs ${
                isSelected ? "text-white/80" : "text-ink-500"
              }`}
            >
              {category.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

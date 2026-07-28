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
        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
          selected.length === 0
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
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
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              isSelected
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {category.name}
            <span
              className={`ml-1.5 text-xs ${
                isSelected ? "text-brand-100" : "text-ink-400"
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

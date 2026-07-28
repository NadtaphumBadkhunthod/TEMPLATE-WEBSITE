import {
  CategoryManager,
  type CategoryRow,
} from "@/components/admin/CategoryManager";
import { getTranslator } from "@/i18n";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireUser();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const rows = await db.category.findMany({
    include: {
      translations: true,
      _count: { select: { projects: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const categories: CategoryRow[] = rows.map((row) => ({
    id: row.id,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    projectCount: row._count.projects,
    translations: Object.fromEntries(
      row.translations.map((tr) => [
        tr.locale,
        {
          name: tr.name,
          slug: tr.slug,
          description: tr.description ?? "",
        },
      ]),
    ),
  }));

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">
        {t("admin.categories")}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        A project can belong to several categories. One of them is marked
        primary and drives breadcrumbs.
      </p>

      <CategoryManager categories={categories} />
    </div>
  );
}

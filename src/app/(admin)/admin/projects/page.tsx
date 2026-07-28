import Link from "next/link";

import { toggleProjectStatus } from "@/app/actions/admin/projects";
import { getTranslator } from "@/i18n";
import { locales } from "@/i18n/config";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const query = await searchParams;
  const statusFilter =
    typeof query.status === "string" &&
    ["draft", "published", "archived"].includes(query.status)
      ? (query.status as "draft" | "published" | "archived")
      : undefined;
  const search = typeof query.q === "string" ? query.q.trim() : "";

  const projects = await db.project.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            translations: {
              some: { title: { contains: search, mode: "insensitive" } },
            },
          }
        : {}),
    },
    include: {
      translations: true,
      categories: { include: { category: { include: { translations: true } } } },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink-900">
          {t("admin.projects")}
        </h1>
        <Link
          href="/admin/projects/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          + {t("common.create")}
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={search}
          placeholder={t("common.search")}
          className="w-64 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">{t("common.all")}</option>
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="archived">archived</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:border-brand-400"
        >
          {t("common.search")}
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-[--radius-card] border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Languages</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium">{t("common.status")}</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-500">
                  {t("admin.noData")}
                </td>
              </tr>
            )}

            {projects.map((project) => {
              const title =
                project.translations.find((tr) => tr.locale === locale)?.title ??
                project.translations[0]?.title ??
                "(untitled)";

              return (
                <tr key={project.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {title}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {locales.map((code) => {
                        const tr = project.translations.find(
                          (x) => x.locale === code,
                        );
                        const state = !tr
                          ? "missing"
                          : tr.isPublished
                            ? "live"
                            : "draft";
                        return (
                          <span
                            key={code}
                            title={state}
                            className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${
                              state === "live"
                                ? "bg-emerald-100 text-emerald-800"
                                : state === "draft"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-ink-100 text-ink-400"
                            }`}
                          >
                            {code}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-ink-600">
                    {project.categories
                      .map(
                        (link) =>
                          link.category.translations.find(
                            (tr) => tr.locale === locale,
                          )?.name ?? link.category.translations[0]?.name,
                      )
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        project.status === "published"
                          ? "bg-emerald-100 text-emerald-800"
                          : project.status === "draft"
                            ? "bg-ink-100 text-ink-600"
                            : "bg-ink-200 text-ink-600"
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-ink-500">
                    {formatDate(project.updatedAt, locale)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <form action={toggleProjectStatus} className="inline">
                      <input type="hidden" name="id" value={project.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          project.status === "published" ? "draft" : "published"
                        }
                      />
                      <button
                        type="submit"
                        className="text-xs font-medium text-brand-700 hover:text-brand-800"
                      >
                        {project.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

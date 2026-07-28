import Link from "next/link";

import { getTranslator } from "@/i18n";
import { locales } from "@/i18n/config";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireUser();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const [newQuotes, published, drafts, recentQuotes, totalProjects, translated] =
    await Promise.all([
      db.quoteRequest.count({ where: { status: "new" } }),
      db.project.count({ where: { status: "published" } }),
      db.project.count({ where: { status: "draft" } }),
      db.quoteRequest.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { project: { include: { translations: true } } },
      }),
      db.project.count(),
      db.projectTranslation.groupBy({
        by: ["locale"],
        _count: { _all: true },
      }),
    ]);

  // A project is "missing" a language if it has no translation row for it.
  const missing = locales.map((code) => {
    const row = translated.find((entry) => entry.locale === code);
    return { locale: code, missing: totalProjects - (row?._count._all ?? 0) };
  });

  const stats = [
    {
      label: t("admin.newQuotes"),
      value: newQuotes,
      href: "/admin/quotes?status=new",
      accent: newQuotes > 0,
    },
    {
      label: t("admin.publishedProjects"),
      value: published,
      href: "/admin/projects?status=published",
      accent: false,
    },
    {
      label: t("admin.draftProjects"),
      value: drafts,
      href: "/admin/projects?status=draft",
      accent: false,
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">
        {t("admin.dashboard")}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-[--radius-card] border bg-white p-5 transition hover:border-brand-300 ${
              stat.accent ? "border-brand-400" : "border-ink-200"
            }`}
          >
            <p className="text-sm text-ink-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-ink-900">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink-900">
              {t("admin.recentQuotes")}
            </h2>
            <Link
              href="/admin/quotes"
              className="text-sm text-brand-700 hover:text-brand-800"
            >
              {t("admin.quotes")} →
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              {t("admin.noData")}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {recentQuotes.map((quote) => {
                const projectTitle =
                  quote.project?.translations.find((tr) => tr.locale === locale)
                    ?.title ?? quote.project?.translations[0]?.title;
                return (
                  <li key={quote.id}>
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="flex items-center gap-4 py-3 transition hover:bg-ink-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">
                          {quote.name}
                        </span>
                        <span className="block truncate text-xs text-ink-500">
                          {projectTitle || quote.email}
                        </span>
                      </span>
                      {quote.status === "new" && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
                          new
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-ink-400">
                        {formatDateTime(quote.createdAt, locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5">
          <h2 className="font-medium text-ink-900">
            {t("admin.missingTranslations")}
          </h2>
          <ul className="mt-4 space-y-3">
            {missing.map((entry) => (
              <li
                key={entry.locale}
                className="flex items-center justify-between text-sm"
              >
                <span className="uppercase text-ink-500">{entry.locale}</span>
                <span
                  className={
                    entry.missing > 0
                      ? "font-medium text-amber-700"
                      : "text-ink-400"
                  }
                >
                  {entry.missing}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

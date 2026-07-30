import Link from "next/link";

import { getTranslator } from "@/i18n";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-brand-100 text-brand-800",
  in_progress: "bg-amber-100 text-amber-800",
  quoted: "bg-indigo-100 text-indigo-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-ink-200 text-ink-600",
  spam: "bg-red-100 text-red-700",
};

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "";
  const search = typeof query.q === "string" ? query.q.trim() : "";

  const quotes = await db.quoteRequest.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    include: { project: { include: { translations: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">{t("admin.quotes")}</h1>

      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={search}
          placeholder={t("common.search")}
          className="w-64 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t("common.all")}</option>
          {Object.keys(STATUS_STYLES).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
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
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">{t("common.status")}</th>
              <th className="px-4 py-3 font-medium">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {quotes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-500">
                  {t("admin.noData")}
                </td>
              </tr>
            )}

            {quotes.map((quote) => {
              const projectTitle =
                quote.project?.translations.find((tr) => tr.locale === locale)
                  ?.title ?? quote.project?.translations[0]?.title;

              return (
                <tr key={quote.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {quote.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    <div>{quote.email}</div>
                    {quote.phone && (
                      <div className="text-xs text-ink-500">{quote.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {projectTitle ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[quote.status] ?? "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {formatDateTime(quote.createdAt, locale)}
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

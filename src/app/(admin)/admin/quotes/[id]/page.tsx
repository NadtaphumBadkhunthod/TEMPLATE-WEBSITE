import Link from "next/link";
import { notFound } from "next/navigation";

import { addQuoteNote, updateQuoteStatus } from "@/app/actions/admin/quotes";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "in_progress", "quoted", "won", "lost", "spam"];

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const locale = await getAdminLocale();

  const quote = await db.quoteRequest.findUnique({
    where: { id },
    include: {
      project: { include: { translations: true } },
      notes: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!quote) notFound();

  const projectTitle =
    quote.project?.translations.find((tr) => tr.locale === locale)?.title ??
    quote.project?.translations[0]?.title;

  // Rendered from the frozen snapshot, so the labels match what the person
  // actually saw — even if the form has been edited since.
  const snapshot = Array.isArray(quote.fieldSnapshot)
    ? (quote.fieldSnapshot as {
        key: string;
        label: string;
        type: string;
        value: unknown;
      }[])
    : [];

  return (
    <div className="p-8">
      <Link
        href="/admin/quotes"
        className="text-xs text-ink-500 hover:text-brand-700"
      >
        ← Quote requests
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink-900">{quote.name}</h1>
        <form action={updateQuoteStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={quote.id} />
          <select
            name="status"
            defaultValue={quote.status}
            className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Update
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Submission</h2>
            <dl className="mt-4 divide-y divide-ink-100">
              {snapshot.length === 0 ? (
                <p className="py-4 text-sm text-ink-500">
                  No field snapshot recorded.
                </p>
              ) : (
                snapshot.map((field) => (
                  <div key={field.key} className="flex flex-wrap gap-2 py-3">
                    <dt className="w-44 shrink-0 text-sm font-medium text-ink-500">
                      {field.label}
                    </dt>
                    <dd className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-ink-800">
                      {typeof field.value === "boolean"
                        ? field.value
                          ? "Yes"
                          : "No"
                        : String(field.value ?? "—")}
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </section>

          <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Internal notes</h2>

            <form action={addQuoteNote} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={quote.id} />
              <textarea
                name="body"
                rows={3}
                placeholder="Add a note…"
                className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="rounded-lg border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-700 hover:border-brand-400"
              >
                Add note
              </button>
            </form>

            <ul className="mt-5 space-y-3">
              {quote.notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm"
                >
                  <p className="whitespace-pre-wrap text-ink-800">{note.body}</p>
                  <p className="mt-1.5 text-xs text-ink-400">
                    {note.author?.name ?? "—"} ·{" "}
                    {formatDateTime(note.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold text-ink-900">Contact</h2>
            <dl className="mt-3 space-y-2">
              <Row label="Email">
                <a
                  href={`mailto:${quote.email}`}
                  className="text-brand-700 hover:underline"
                >
                  {quote.email}
                </a>
              </Row>
              {quote.phone && (
                <Row label="Phone">
                  <a
                    href={`tel:${quote.phone.replace(/\s+/g, "")}`}
                    className="text-brand-700 hover:underline"
                  >
                    {quote.phone}
                  </a>
                </Row>
              )}
              <Row label="Language">{quote.locale}</Row>
              <Row label="Received">
                {formatDateTime(quote.createdAt, locale)}
              </Row>
            </dl>
          </section>

          <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold text-ink-900">Context</h2>
            <dl className="mt-3 space-y-2">
              <Row label="Project">
                {quote.project && projectTitle ? (
                  <Link
                    href={`/admin/projects/${quote.project.id}`}
                    className="text-brand-700 hover:underline"
                  >
                    {projectTitle}
                  </Link>
                ) : (
                  "General enquiry"
                )}
              </Row>
              {quote.sourceUrl && <Row label="Source">{quote.sourceUrl}</Row>}
              {quote.ipAddress && <Row label="IP">{quote.ipAddress}</Row>}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <dt className="w-20 shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-ink-800">{children}</dd>
    </div>
  );
}

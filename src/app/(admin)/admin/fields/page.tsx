import Link from "next/link";

import {
  deleteFieldDefinition,
  saveFieldDefinition,
} from "@/app/actions/admin/fields";
import { getTranslator } from "@/i18n";
import { localeLabels, locales } from "@/i18n/config";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATA_TYPES = ["text", "number", "boolean", "date", "select", "url"];

export default async function AdminFieldsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const query = await searchParams;
  const editId = typeof query.edit === "string" ? query.edit : null;

  const fields = await db.fieldDefinition.findMany({
    where: { entity: "project" },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });

  const editing = editId ? fields.find((f) => f.id === editId) : null;
  const editingChoices =
    ((editing?.options as { choices?: { value: string }[] } | null)?.choices ??
      []).map((choice) => choice.value);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">{t("admin.fields")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        Add project attributes without touching the schema. Fields defined here
        appear on the project editor and in the specifications table on the
        public detail page.
      </p>

      {query.error === "duplicate" && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          A field with that key already exists.
        </p>
      )}
      {query.saved && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Saved.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="overflow-hidden rounded-[--radius-card] border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Per-language</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {fields.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-ink-500"
                  >
                    {t("admin.noData")}
                  </td>
                </tr>
              )}
              {fields.map((field) => (
                <tr key={field.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/fields?edit=${field.id}`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {field.translations.find((tr) => tr.locale === locale)
                        ?.label ??
                        field.translations[0]?.label ??
                        field.key}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">
                    {field.key}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{field.dataType}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {field.isTranslatable ? "yes" : "no"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteFieldDefinition} className="inline">
                      <input type="hidden" name="id" value={field.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        {t("common.delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          action={saveFieldDefinition}
          key={editing?.id ?? "new"}
          className="rounded-[--radius-card] border border-ink-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              {editing ? "Edit field" : "New field"}
            </h2>
            {editing && (
              <Link
                href="/admin/fields"
                className="text-xs text-ink-500 hover:text-ink-800"
              >
                New instead
              </Link>
            )}
          </div>

          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass}>Key</label>
              <input
                name="key"
                defaultValue={editing?.key ?? ""}
                placeholder="coverage_area"
                required
                className={`${inputClass} font-mono text-xs`}
              />
              <p className="mt-1 text-xs text-ink-500">
                Stored as a JSON key. Letters, digits and underscores.
              </p>
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select
                name="dataType"
                defaultValue={editing?.dataType ?? "text"}
                className={inputClass}
              >
                {DATA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Choices (for type <code>select</code>)
              </label>
              <input
                name="choices"
                defaultValue={editingChoices.join(", ")}
                placeholder="lora, nbiot, wifi"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-ink-500">
                Comma-separated values. Labels per language are set below.
              </p>
            </div>

            {locales.map((code) => {
              const tr = editing?.translations.find((x) => x.locale === code);
              return (
                <fieldset key={code} className="space-y-2">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {localeLabels[code]}
                  </legend>
                  <input
                    name={`label_${code}`}
                    defaultValue={tr?.label ?? ""}
                    placeholder="Label"
                    className={inputClass}
                  />
                  <input
                    name={`help_${code}`}
                    defaultValue={tr?.helpText ?? ""}
                    placeholder="Help text (optional)"
                    className={inputClass}
                  />
                  {editingChoices.map((value) => {
                    const labels = (tr?.choiceLabels ?? {}) as Record<
                      string,
                      string
                    >;
                    return (
                      <input
                        key={value}
                        name={`choice_${code}_${value}`}
                        defaultValue={labels[value] ?? ""}
                        placeholder={`Label for "${value}"`}
                        className={`${inputClass} text-xs`}
                      />
                    );
                  })}
                </fieldset>
              );
            })}

            <div className="space-y-2">
              <Checkbox
                name="isTranslatable"
                defaultChecked={editing?.isTranslatable ?? false}
                label="Different value per language"
              />
              <Checkbox
                name="showOnDetail"
                defaultChecked={editing?.showOnDetail ?? true}
                label="Show in the specifications table"
              />
              <Checkbox
                name="isFilterable"
                defaultChecked={editing?.isFilterable ?? false}
                label="Mark as filterable (reserved for future filter UI)"
              />
              <Checkbox
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
                label="Active"
              />
            </div>

            <div>
              <label className={labelClass}>Sort order</label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={editing?.sortOrder ?? 0}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save field
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";
const labelClass = "mb-1.5 block text-xs font-medium text-ink-700";

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-ink-300 text-brand-600"
      />
      {label}
    </label>
  );
}

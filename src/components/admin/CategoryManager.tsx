"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteCategory, saveCategory } from "@/app/actions/admin/categories";
import {
  initialCategoryState,
  type CategoryState,
} from "@/lib/action-state";
import { localeLabels, locales } from "@/i18n/config";

export type CategoryRow = {
  id: string;
  sortOrder: number;
  isActive: boolean;
  projectCount: number;
  translations: Record<
    string,
    { name: string; slug: string; description: string }
  >;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="overflow-hidden rounded-[--radius-card] border border-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Projects</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-500">
                  No categories yet.
                </td>
              </tr>
            )}
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-ink-50">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(category);
                      setCreating(false);
                    }}
                    className="font-medium text-ink-900 hover:text-brand-700"
                  >
                    {locales
                      .map((code) => category.translations[code]?.name)
                      .filter(Boolean)
                      .join(" / ") || "(unnamed)"}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">
                  {locales
                    .map((code) => category.translations[code]?.slug)
                    .filter(Boolean)
                    .join(" / ")}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {category.projectCount}
                </td>
                <td className="px-4 py-3">
                  {category.isActive ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                      yes
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500">
                      no
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {category.projectCount === 0 ? (
                    <form action={deleteCategory} className="inline">
                      <input type="hidden" name="id" value={category.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  ) : (
                    <span
                      title="Remove it from all projects first"
                      className="text-xs text-ink-500"
                    >
                      In use
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        {editing || creating ? (
          <CategoryForm
            key={editing?.id ?? "new"}
            category={editing}
            onDone={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full rounded-[--radius-card] border border-dashed border-ink-300 px-4 py-8 text-sm text-ink-600 hover:border-brand-400 hover:text-brand-700"
          >
            + New category
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category: CategoryRow | null;
  onDone: () => void;
}) {
  const [state, action] = useActionState<CategoryState, FormData>(
    saveCategory,
    initialCategoryState,
  );

  return (
    <form
      action={action}
      className="rounded-[--radius-card] border border-ink-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">
          {category ? "Edit category" : "New category"}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-ink-500 hover:text-ink-800"
        >
          Close
        </button>
      </div>

      {category && <input type="hidden" name="id" value={category.id} />}

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Saved.
        </p>
      )}

      <div className="mt-4 space-y-5">
        {locales.map((code) => (
          <fieldset key={code} className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              {localeLabels[code]}
            </legend>
            <input
              name={`name_${code}`}
              defaultValue={category?.translations[code]?.name ?? ""}
              placeholder="Name"
              className={inputClass}
            />
            <input
              name={`slug_${code}`}
              defaultValue={category?.translations[code]?.slug ?? ""}
              placeholder="slug (auto if blank)"
              className={`${inputClass} font-mono text-xs`}
            />
            <textarea
              name={`description_${code}`}
              defaultValue={category?.translations[code]?.description ?? ""}
              placeholder="Description (optional)"
              rows={2}
              className={inputClass}
            />
          </fieldset>
        ))}

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={category?.isActive ?? true}
              className="size-4 rounded border-ink-300 text-brand-600"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            Order
            <input
              type="number"
              name="sortOrder"
              defaultValue={category?.sortOrder ?? 0}
              className="w-20 rounded border border-ink-300 px-2 py-1 text-sm"
            />
          </label>
        </div>

        <Submit />
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

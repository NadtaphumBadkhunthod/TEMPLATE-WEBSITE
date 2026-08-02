"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveProject } from "@/app/actions/admin/projects";
import { initialSaveState, type SaveState } from "@/lib/action-state";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import type { Block } from "@/lib/blocks";
import { slugify } from "@/lib/slug";

import { BlockEditor } from "./BlockEditor";
import { MediaPicker, type MediaOption } from "./MediaPicker";

export type CategoryOption = { id: string; name: string };

export type FieldOption = {
  key: string;
  label: string;
  dataType: string;
  isTranslatable: boolean;
  choices: { value: string; label: string }[];
  helpText: string;
};

export type TranslationDraft = {
  slug: string;
  title: string;
  summary: string;
  body: Block[];
  features: { text: string }[];
  custom: Record<string, unknown>;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  /**
   * Brochure pages for this language, in order. Per-translation because a
   * brochure is a printed artefact — the Thai and English ones are different
   * files, not the same file with different captions.
   */
  brochure: string[];
};

const INFO_DISPLAY_MODES = [
  {
    value: "text",
    label: "Typed text",
    hint: "Show the description and feature list written below.",
  },
  {
    value: "brochure",
    label: "Brochure only",
    hint: "Show the uploaded brochure instead of the typed text.",
  },
  {
    value: "both",
    label: "Brochure, then text",
    hint: "Show the brochure first, with the typed text underneath.",
  },
] as const;

export type ProjectDraft = {
  id?: string;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  sortOrder: number;
  infoDisplay: "text" | "brochure" | "both";
  coverMediaId: string | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  custom: Record<string, unknown>;
  gallery: string[];
  attachments: { mediaId: string; label: string }[];
  translations: Record<string, TranslationDraft>;
};

export function ProjectEditor({
  initial,
  categories,
  mediaAssets,
  fields,
}: {
  initial: ProjectDraft;
  categories: CategoryOption[];
  mediaAssets: MediaOption[];
  fields: FieldOption[];
}) {
  const [state, action] = useActionState<SaveState, FormData>(
    saveProject,
    initialSaveState,
  );

  const [draft, setDraft] = useState<ProjectDraft>(initial);
  const [assets, setAssets] = useState<MediaOption[]>(mediaAssets);
  const [tab, setTab] = useState<Locale>(locales[0]);

  const current = draft.translations[tab];

  function patch(next: Partial<ProjectDraft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function patchTranslation(locale: string, next: Partial<TranslationDraft>) {
    setDraft((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: { ...prev.translations[locale], ...next },
      },
    }));
  }

  function copyFrom(source: Locale) {
    const from = draft.translations[source];
    patchTranslation(tab, {
      title: from.title,
      summary: from.summary,
      body: structuredClone(from.body),
      features: structuredClone(from.features),
      slug: from.slug,
    });
  }

  return (
    <form action={action}>
      <input type="hidden" name="payload" value={JSON.stringify(draft)} />

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-white/95 px-8 py-4 backdrop-blur">
        <div>
          <Link
            href="/admin/projects"
            className="text-xs text-ink-500 hover:text-brand-700"
          >
            ← Projects
          </Link>
          <h1 className="text-lg font-semibold text-ink-900">
            {draft.id ? current?.title || "Untitled" : "New project"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={draft.status}
            onChange={(event) =>
              patch({ status: event.target.value as ProjectDraft["status"] })
            }
            className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <SaveButton />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="mx-8 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      )}
      {state.status === "saved" && (
        <p className="mx-8 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Saved.
        </p>
      )}

      <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <Panel title="Content">
            <div className="mb-5 flex items-center gap-2 border-b border-ink-200">
              {locales.map((code) => {
                const tr = draft.translations[code];
                const filled = !!tr?.title.trim();
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setTab(code)}
                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                      tab === code
                        ? "border-brand-600 text-brand-800"
                        : "border-transparent text-ink-500 hover:text-ink-800"
                    }`}
                  >
                    {localeLabels[code]}
                    <span
                      title={filled ? "Has content" : "Empty"}
                      className={`ml-2 inline-block size-1.5 rounded-full ${
                        filled ? "bg-emerald-500" : "bg-ink-300"
                      }`}
                    />
                  </button>
                );
              })}

              {locales.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    copyFrom(locales.find((code) => code !== tab) ?? locales[0])
                  }
                  className="ml-auto text-xs text-ink-500 hover:text-brand-700"
                >
                  Copy from other language
                </button>
              )}
            </div>

            {current && (
              <div className="space-y-4">
                <Labelled label="Title">
                  <input
                    value={current.title}
                    onChange={(event) =>
                      patchTranslation(tab, { title: event.target.value })
                    }
                    onBlur={() => {
                      if (!current.slug.trim() && current.title.trim()) {
                        patchTranslation(tab, {
                          slug: slugify(current.title),
                        });
                      }
                    }}
                    className={inputClass}
                  />
                </Labelled>

                <Labelled
                  label="URL slug"
                  hint={`/${tab}/projects/${current.slug || "…"}`}
                >
                  <input
                    value={current.slug}
                    onChange={(event) =>
                      patchTranslation(tab, { slug: event.target.value })
                    }
                    className={inputClass}
                  />
                </Labelled>

                <Labelled label="Summary" hint="Shown on cards and previews">
                  <textarea
                    value={current.summary}
                    onChange={(event) =>
                      patchTranslation(tab, { summary: event.target.value })
                    }
                    rows={3}
                    className={inputClass}
                  />
                </Labelled>

                <Labelled label="Description">
                  <BlockEditor
                    value={current.body}
                    onChange={(body) => patchTranslation(tab, { body })}
                  />
                </Labelled>

                <Labelled label="Key features" hint="Bullet list on the detail page">
                  <FeatureEditor
                    value={current.features}
                    onChange={(features) => patchTranslation(tab, { features })}
                  />
                </Labelled>

                {/*
                  Sits inside the language tab because a brochure is a printed
                  artefact — the Thai and English ones are different files.
                */}
                <Labelled
                  label={`Brochure (${localeLabels[tab]})`}
                  hint="A PDF, or image pages in order. Used when the presentation below is set to brochure."
                >
                  <MediaPicker
                    assets={assets}
                    selected={current.brochure}
                    onChange={(brochure) => patchTranslation(tab, { brochure })}
                    onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
                    emptyLabel="Upload a PDF or image pages."
                  />
                  {draft.infoDisplay === "text" &&
                    current.brochure.length > 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Presentation is set to “Typed text”, so this brochure is
                        not shown on the site. Change it under Presentation.
                      </p>
                    )}
                  {draft.infoDisplay !== "text" &&
                    current.brochure.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No brochure for {localeLabels[tab]} yet — this language
                        falls back to another one&rsquo;s brochure, or to the
                        typed text.
                      </p>
                    )}
                </Labelled>

                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={current.isPublished}
                    onChange={(event) =>
                      patchTranslation(tab, { isPublished: event.target.checked })
                    }
                    className="size-4 rounded border-ink-300 text-brand-600"
                  />
                  Publish the {localeLabels[tab]} version
                </label>
              </div>
            )}
          </Panel>

          {fields.length > 0 && (
            <Panel
              title="Custom fields"
              hint="Defined in Settings → Custom fields"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const store = field.isTranslatable
                    ? (current?.custom ?? {})
                    : draft.custom;
                  const value = store[field.key];

                  function setValue(next: unknown) {
                    if (field.isTranslatable) {
                      patchTranslation(tab, {
                        custom: { ...(current?.custom ?? {}), [field.key]: next },
                      });
                    } else {
                      patch({ custom: { ...draft.custom, [field.key]: next } });
                    }
                  }

                  return (
                    <Labelled
                      key={field.key}
                      label={`${field.label}${field.isTranslatable ? ` (${tab})` : ""}`}
                      hint={field.helpText}
                    >
                      {field.dataType === "select" ? (
                        <select
                          value={String(value ?? "")}
                          onChange={(event) => setValue(event.target.value)}
                          className={inputClass}
                        >
                          <option value="">—</option>
                          {field.choices.map((choice) => (
                            <option key={choice.value} value={choice.value}>
                              {choice.label}
                            </option>
                          ))}
                        </select>
                      ) : field.dataType === "boolean" ? (
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(event) => setValue(event.target.checked)}
                          className="size-4 rounded border-ink-300 text-brand-600"
                        />
                      ) : (
                        <input
                          type={
                            field.dataType === "number"
                              ? "number"
                              : field.dataType === "date"
                                ? "date"
                                : "text"
                          }
                          value={String(value ?? "")}
                          onChange={(event) => setValue(event.target.value)}
                          className={inputClass}
                        />
                      )}
                    </Labelled>
                  );
                })}
              </div>
            </Panel>
          )}

          <Panel title="SEO" hint={`Applies to the ${localeLabels[tab]} version`}>
            {current && (
              <div className="space-y-4">
                <Labelled label="Meta title">
                  <input
                    value={current.seoTitle}
                    onChange={(event) =>
                      patchTranslation(tab, { seoTitle: event.target.value })
                    }
                    placeholder={current.title}
                    className={inputClass}
                  />
                </Labelled>
                <Labelled label="Meta description">
                  <textarea
                    value={current.seoDescription}
                    onChange={(event) =>
                      patchTranslation(tab, {
                        seoDescription: event.target.value,
                      })
                    }
                    rows={2}
                    placeholder={current.summary}
                    className={inputClass}
                  />
                </Labelled>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Presentation"
            hint="How the detail page shows this project"
          >
            <div className="space-y-2">
              {INFO_DISPLAY_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className="flex cursor-pointer gap-2.5 text-sm text-ink-700"
                >
                  <input
                    type="radio"
                    name="infoDisplay"
                    value={mode.value}
                    checked={draft.infoDisplay === mode.value}
                    onChange={() => patch({ infoDisplay: mode.value })}
                    className="mt-1 size-4 shrink-0 border-ink-300 text-brand-600"
                  />
                  <span>
                    <span className="block font-medium">{mode.label}</span>
                    <span className="block text-xs text-ink-500">
                      {mode.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {draft.infoDisplay !== "text" &&
              locales.every(
                (code) => (draft.translations[code]?.brochure.length ?? 0) === 0,
              ) && (
                <p className="mt-3 text-xs text-amber-700">
                  No brochure uploaded in any language yet — the site will keep
                  showing the typed text until one is added.
                </p>
              )}
          </Panel>

          <Panel title="Categories">
            {categories.length === 0 ? (
              <p className="text-sm text-ink-500">
                No categories yet.{" "}
                <Link
                  href="/admin/categories"
                  className="text-brand-700 hover:underline"
                >
                  Create one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map((category) => {
                  const checked = draft.categoryIds.includes(category.id);
                  return (
                    <li key={category.id} className="flex items-center gap-2">
                      <label className="flex flex-1 items-center gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...draft.categoryIds, category.id]
                              : draft.categoryIds.filter(
                                  (id) => id !== category.id,
                                );
                            patch({
                              categoryIds: next,
                              primaryCategoryId:
                                draft.primaryCategoryId &&
                                next.includes(draft.primaryCategoryId)
                                  ? draft.primaryCategoryId
                                  : (next[0] ?? null),
                            });
                          }}
                          className="size-4 rounded border-ink-300 text-brand-600"
                        />
                        {category.name}
                      </label>

                      {checked && (
                        <button
                          type="button"
                          onClick={() =>
                            patch({ primaryCategoryId: category.id })
                          }
                          title="Primary category — used for breadcrumbs"
                          className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${
                            draft.primaryCategoryId === category.id
                              ? "bg-brand-600 text-white"
                              : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                          }`}
                        >
                          primary
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Cover image">
            <MediaPicker
              assets={assets}
              selected={draft.coverMediaId ? [draft.coverMediaId] : []}
              onChange={(next) => patch({ coverMediaId: next[0] ?? null })}
              onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
              multiple={false}
              kinds={["image"]}
              emptyLabel="Upload an image to use as the cover."
            />
          </Panel>

          <Panel title="Gallery">
            <MediaPicker
              assets={assets}
              selected={draft.gallery}
              onChange={(gallery) => patch({ gallery })}
              onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
              kinds={["image"]}
              emptyLabel="No images yet."
            />
          </Panel>

          <Panel title="Attachments" hint="Brochures, spec sheets, downloads">
            <MediaPicker
              assets={assets}
              selected={draft.attachments.map((a) => a.mediaId)}
              onChange={(ids) =>
                patch({
                  attachments: ids.map(
                    (mediaId) =>
                      draft.attachments.find((a) => a.mediaId === mediaId) ?? {
                        mediaId,
                        label: "",
                      },
                  ),
                })
              }
              onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
              emptyLabel="No files yet."
            />

            {draft.attachments.length > 0 && (
              <ul className="mt-3 space-y-2">
                {draft.attachments.map((attachment) => {
                  const asset = assets.find((a) => a.id === attachment.mediaId);
                  return (
                    <li key={attachment.mediaId}>
                      <input
                        value={attachment.label}
                        placeholder={asset?.originalName ?? "Label"}
                        onChange={(event) =>
                          patch({
                            attachments: draft.attachments.map((a) =>
                              a.mediaId === attachment.mediaId
                                ? { ...a, label: event.target.value }
                                : a,
                            ),
                          })
                        }
                        className="w-full rounded border border-ink-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Options">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(event) => patch({ isFeatured: event.target.checked })}
                className="size-4 rounded border-ink-300 text-brand-600"
              />
              Feature on the homepage
            </label>
            <Labelled label="Sort order" className="mt-4">
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) =>
                  patch({ sortOrder: Number(event.target.value) || 0 })
                }
                className={inputClass}
              />
            </Labelled>
          </Panel>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Labelled({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function FeatureEditor({
  value,
  onChange,
}: {
  value: { text: string }[];
  onChange: (next: { text: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((feature, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={feature.text}
            onChange={(event) =>
              onChange(
                value.map((item, i) =>
                  i === index ? { text: event.target.value } : item,
                ),
              )
            }
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            aria-label="Remove feature"
            className="rounded px-2 text-xs text-red-600 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { text: "" }])}
        className="text-xs text-brand-700 hover:text-brand-800"
      >
        + feature
      </button>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

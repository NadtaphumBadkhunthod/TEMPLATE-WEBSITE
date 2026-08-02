import { cache } from "react";

import { db } from "./db";
import { mediaUrl } from "./media";
import { getSettings } from "./settings";
import { parseBlocks, parseFeatures, type Block, type Feature } from "./blocks";
import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import type { Translator } from "@/i18n";

/**
 * Scale note: the catalogue is fetched and then filtered/sorted/paginated in
 * memory. That keeps the per-locale publish + fallback rules in one readable
 * place, and is comfortably fast for the few hundred projects this kind of site
 * holds. Move to SQL-level pagination if the catalogue reaches five figures.
 */

export type ProjectCategoryView = {
  id: string;
  slug: string;
  name: string;
  isPrimary: boolean;
};

export type AttachmentView = {
  id: string;
  label: string;
  /**
   * The uploaded file's own name, kept alongside the display label so the UI can
   * derive a file-type badge from the real extension — the label is free text
   * the admin wrote and usually has no extension in it.
   */
  fileName: string | null;
  url: string;
  isExternal: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type ProjectListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  coverAlt: string;
  categories: ProjectCategoryView[];
  /** False when this locale falls back to another language's content. */
  isTranslated: boolean;
};

/** One page of a brochure: a whole PDF, or a single image page. */
export type BrochurePage = {
  id: string;
  /** `pdf` embeds in a viewer; `image` renders as a page. */
  kind: "pdf" | "image";
  url: string;
  /** Always forces a download, whatever the type. */
  downloadUrl: string;
  label: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type BrochureView = {
  pages: BrochurePage[];
  /** False when this language has no brochure and another one's is shown. */
  isTranslated: boolean;
};

export type ProjectDetail = ProjectListItem & {
  /**
   * How the admin chose to present this project. `brochure` and `both` fall back
   * to `text` at render time when no brochure has actually been uploaded, so the
   * page can never come out empty.
   */
  infoDisplay: "text" | "brochure" | "both";
  brochure: BrochureView | null;
  body: Block[];
  features: Feature[];
  gallery: { id: string; url: string; alt: string }[];
  attachments: AttachmentView[];
  specs: { key: string; label: string; value: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
};

const projectInclude = {
  translations: true,
  coverMedia: { include: { translations: true } },
  categories: {
    include: { category: { include: { translations: true } } },
  },
  media: {
    include: { media: { include: { translations: true } } },
    orderBy: { sortOrder: "asc" },
  },
} as const;

type ProjectRow = Awaited<
  ReturnType<typeof db.project.findMany<{ include: typeof projectInclude }>>
>[number];

/**
 * Picks the translation for `locale`, honouring the site's fallback policy.
 * Returns null when the project should not be visible in this language at all.
 */
function pickTranslation<T extends { locale: string; isPublished: boolean }>(
  translations: T[],
  locale: Locale,
  fallbackPolicy: "hide" | "fallback",
): { row: T; isTranslated: boolean } | null {
  const exact = translations.find((tr) => tr.locale === locale);
  if (exact && exact.isPublished) return { row: exact, isTranslated: true };

  if (fallbackPolicy === "hide") return null;

  const fallback =
    translations.find((tr) => tr.locale === defaultLocale && tr.isPublished) ??
    translations.find((tr) => tr.isPublished);

  return fallback ? { row: fallback, isTranslated: false } : null;
}

function categoryName(
  translations: { locale: string; name: string; slug: string }[],
  locale: Locale,
) {
  const exact = translations.find((tr) => tr.locale === locale);
  const fallback =
    translations.find((tr) => tr.locale === defaultLocale) ?? translations[0];
  return exact ?? fallback ?? null;
}

function mediaAlt(
  translations: { locale: string; altText: string | null }[],
  locale: Locale,
  fallbackText: string,
) {
  const exact = translations.find((tr) => tr.locale === locale);
  return exact?.altText || fallbackText;
}

async function toListItem(
  project: ProjectRow,
  locale: Locale,
  fallbackPolicy: "hide" | "fallback",
): Promise<ProjectListItem | null> {
  const picked = pickTranslation(project.translations, locale, fallbackPolicy);
  if (!picked) return null;

  const categories = project.categories
    .map((link) => {
      const name = categoryName(link.category.translations, locale);
      if (!name) return null;
      return {
        id: link.category.id,
        slug: name.slug,
        name: name.name,
        isPrimary: link.isPrimary,
      };
    })
    .filter((c): c is ProjectCategoryView => c !== null);

  return {
    id: project.id,
    slug: picked.row.slug,
    title: picked.row.title,
    summary: picked.row.summary ?? "",
    coverUrl: mediaUrl(project.coverMedia),
    coverAlt: project.coverMedia
      ? mediaAlt(project.coverMedia.translations, locale, picked.row.title)
      : picked.row.title,
    categories,
    isTranslated: picked.isTranslated,
  };
}

export type ProjectQuery = {
  categorySlugs?: string[];
  sort?: "newest" | "oldest" | "name";
  page?: number;
  perPage?: number;
  featuredOnly?: boolean;
  limit?: number;
};

export async function getProjects(
  locale: Locale,
  query: ProjectQuery = {},
): Promise<{ items: ProjectListItem[]; total: number; pages: number }> {
  const settings = await getSettings();
  const fallbackPolicy = settings.i18n.contentFallback;

  const rows = await db.project.findMany({
    where: {
      status: "published",
      ...(query.featuredOnly ? { isFeatured: true } : {}),
      ...(query.categorySlugs?.length
        ? {
            categories: {
              some: {
                category: {
                  isActive: true,
                  translations: { some: { slug: { in: query.categorySlugs } } },
                },
              },
            },
          }
        : {}),
    },
    include: projectInclude,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });

  const mapped: ProjectListItem[] = [];
  for (const row of rows) {
    const item = await toListItem(row, locale, fallbackPolicy);
    if (item) mapped.push(item);
  }

  if (query.sort === "name") {
    mapped.sort((a, b) => a.title.localeCompare(b.title, locale));
  } else if (query.sort === "oldest") {
    mapped.reverse();
  }

  const total = mapped.length;

  if (query.limit) {
    return { items: mapped.slice(0, query.limit), total, pages: 1 };
  }

  const perPage = query.perPage ?? 9;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);
  const items = mapped.slice((page - 1) * perPage, page * perPage);

  return { items, total, pages };
}

/**
 * Route params arrive percent-encoded, which is a no-op for ASCII slugs but
 * breaks Thai ones — decode defensively rather than at each call site.
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function getProjectBySlug(
  locale: Locale,
  rawSlug: string,
  t: Translator,
): Promise<ProjectDetail | null> {
  const slug = decodeSlug(rawSlug);
  const settings = await getSettings();
  const fallbackPolicy = settings.i18n.contentFallback;

  // Match the slug in any locale so a shared Thai URL still resolves when the
  // visitor is browsing in English.
  const row = await db.project.findFirst({
    where: {
      status: "published",
      translations: { some: { slug } },
    },
    include: projectInclude,
  });

  if (!row) return null;

  const base = await toListItem(row, locale, fallbackPolicy);
  if (!base) return null;

  const picked = pickTranslation(row.translations, locale, fallbackPolicy);
  if (!picked) return null;

  const brochure = resolveBrochure(row.media, locale, t);

  const gallery = row.media
    .filter((m) => m.isPublic && (m.role === "gallery" || m.role === "cover"))
    .map((m) => {
      const url = mediaUrl(m.media);
      if (!url) return null;
      return {
        id: m.id,
        url,
        alt: mediaAlt(m.media.translations, locale, picked.row.title),
      };
    })
    .filter((m): m is { id: string; url: string; alt: string } => m !== null);

  const attachments = row.media
    .filter(
      (m) =>
        m.isPublic &&
        (m.role === "attachment" || m.role === "document" || m.role === "video"),
    )
    .map((m) => {
      const url = mediaUrl(m.media);
      if (!url) return null;
      return {
        id: m.id,
        label: m.label || m.media.originalName || t("project.download"),
        fileName: m.media.originalName,
        url,
        isExternal: !!m.media.externalUrl,
        mimeType: m.media.mimeType,
        sizeBytes: m.media.sizeBytes,
      };
    })
    .filter((a): a is AttachmentView => a !== null);

  const specs = await resolveSpecs(row, picked.row, locale);

  return {
    ...base,
    slug: picked.row.slug,
    // A brochure-only project with no brochure uploaded would render an empty
    // page, so fall back to the text the admin already has.
    infoDisplay: brochure ? row.infoDisplay : "text",
    brochure,
    body: parseBlocks(picked.row.body),
    features: parseFeatures(picked.row.features),
    gallery,
    attachments,
    specs,
    seoTitle: picked.row.seoTitle,
    seoDescription: picked.row.seoDescription,
  };
}

/**
 * Picks the brochure for `locale`. Brochures are printed per language, so the
 * lookup is: this language's pages, else pages marked as shared across all
 * languages, else the default language's — showing the wrong-language brochure
 * beats showing nothing, and the caller flags it so the page can say so.
 */
function resolveBrochure(
  media: ProjectRow["media"],
  locale: Locale,
  t: Translator,
): BrochureView | null {
  const brochures = media.filter((m) => m.isPublic && m.role === "brochure");
  if (!brochures.length) return null;

  const forLocale = brochures.filter((m) => m.locale === locale);
  const shared = brochures.filter((m) => !m.locale);
  const fallback = brochures.filter((m) => m.locale === defaultLocale);

  const chosen = forLocale.length
    ? forLocale
    : shared.length
      ? shared
      : fallback.length
        ? fallback
        : brochures;

  const pages = chosen
    .map((m): BrochurePage | null => {
      const url = mediaUrl(m.media);
      if (!url) return null;
      const mime = m.media.mimeType ?? "";
      return {
        id: m.id,
        kind: mime.startsWith("image/") ? "image" : "pdf",
        url,
        // External links have no stored bytes to force a download on.
        downloadUrl: m.media.externalUrl ? url : `${url}?download=1`,
        label: m.label || m.media.originalName || t("project.brochure"),
        fileName: m.media.originalName,
        mimeType: m.media.mimeType,
        sizeBytes: m.media.sizeBytes,
      };
    })
    .filter((p): p is BrochurePage => p !== null);

  if (!pages.length) return null;

  return {
    pages,
    isTranslated: forLocale.length > 0 || shared.length > 0,
  };
}

/** Renders admin-defined custom fields into label/value pairs for display. */
async function resolveSpecs(
  project: { custom: unknown },
  translation: { custom: unknown },
  locale: Locale,
): Promise<{ key: string; label: string; value: string }[]> {
  const definitions = await getFieldDefinitions("project");
  const shared = (project.custom ?? {}) as Record<string, unknown>;
  const localised = (translation.custom ?? {}) as Record<string, unknown>;

  const specs: { key: string; label: string; value: string }[] = [];

  for (const def of definitions) {
    if (!def.isActive || !def.showOnDetail) continue;
    const raw = def.isTranslatable ? localised[def.key] : shared[def.key];
    if (raw === undefined || raw === null || raw === "") continue;

    const defTr =
      def.translations.find((tr) => tr.locale === locale) ??
      def.translations.find((tr) => tr.locale === defaultLocale) ??
      def.translations[0];

    let value = String(raw);
    if (def.dataType === "boolean") {
      value = raw ? "✓" : "—";
    } else if (def.dataType === "select") {
      const labels = (defTr?.choiceLabels ?? {}) as Record<string, string>;
      value = labels[String(raw)] ?? String(raw);
    }

    const unit = (def.options as { unit?: string } | null)?.unit;
    if (unit) value = `${value} ${unit}`;

    specs.push({
      key: def.key,
      label: defTr?.label ?? def.key,
      value,
    });
  }

  return specs;
}

export const getFieldDefinitions = cache(async (entity: string) => {
  return db.fieldDefinition.findMany({
    where: { entity },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });
});

export type CategoryView = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  count: number;
};

export async function getCategoriesWithCounts(
  locale: Locale,
): Promise<CategoryView[]> {
  const rows = await db.category.findMany({
    where: { isActive: true },
    include: {
      translations: true,
      _count: {
        select: { projects: { where: { project: { status: "published" } } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return rows
    .map((row) => {
      const tr = categoryName(row.translations, locale);
      if (!tr) return null;
      const full = row.translations.find((t) => t.slug === tr.slug);
      return {
        id: row.id,
        slug: tr.slug,
        name: tr.name,
        description: full?.description ?? null,
        count: row._count.projects,
      };
    })
    .filter((c): c is CategoryView => c !== null);
}

export async function getRelatedProjects(
  locale: Locale,
  project: ProjectDetail,
  limit = 3,
): Promise<ProjectListItem[]> {
  const slugs = project.categories.map((c) => c.slug);
  if (!slugs.length) return [];

  const { items } = await getProjects(locale, { categorySlugs: slugs });
  return items.filter((item) => item.id !== project.id).slice(0, limit);
}

/** All published slugs per locale — used by sitemap.xml and hreflang tags. */
export async function getProjectSlugMap(projectId: string) {
  const rows = await db.projectTranslation.findMany({
    where: { projectId, isPublished: true },
    select: { locale: true, slug: true },
  });
  return Object.fromEntries(rows.map((r) => [r.locale, r.slug]));
}

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

export type ProjectDetail = ProjectListItem & {
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
    body: parseBlocks(picked.row.body),
    features: parseFeatures(picked.row.features),
    gallery,
    attachments,
    specs,
    seoTitle: picked.row.seoTitle,
    seoDescription: picked.row.seoDescription,
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

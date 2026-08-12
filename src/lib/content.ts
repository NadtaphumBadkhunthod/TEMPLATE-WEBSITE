import { getSettings } from "./settings";
import { parseBlocks, parseFeatures, type Block, type Feature } from "./blocks";
import {
  fileNameOf,
  fileSize,
  isExternal,
  loadCategories,
  loadFields,
  loadFileGroups,
  loadProjects,
  mimeForFile,
  publicUrl,
  scanProjectFiles,
  streamUrl,
  type CategoryData,
  type FieldData,
  type Localised,
  type ProjectData,
  type ProjectFile,
  type ProjectTranslationData,
} from "./data";
import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import type { Translator } from "@/i18n";

/**
 * Reads the JSON content store and shapes it for the pages. Everything is
 * filtered, sorted and paginated in memory — the catalogue is a few hundred
 * projects at most, and keeping the per-locale publish and fallback rules in one
 * readable place is worth more than query-level paging here.
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
   * The file's own name, kept alongside the display label so the UI can derive a
   * file-type badge from the real extension — the label is free text and usually
   * has no extension in it.
   */
  fileName: string | null;
  /** Streams the file — used as the `src` of the audio and video players. */
  url: string;
  /** Same file, asked for as a save rather than a preview. */
  downloadUrl: string;
  isExternal: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
};

/**
 * One sub-folder's worth of downloads. Projects that keep everything at the top
 * level of their folder come back as a single group with an empty key, which the
 * list renders without a heading.
 */
export type AttachmentGroup = {
  /** Sub-folder path inside the project folder; "" for the top level. */
  key: string;
  label: string;
  files: AttachmentView[];
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
  /** Always offers the file for download, whatever the type. */
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
   * How the project is presented. `brochure` and `both` fall back to `text` at
   * render time when no brochure file is actually present, so the page can never
   * come out empty.
   */
  infoDisplay: "text" | "brochure" | "both";
  brochure: BrochureView | null;
  body: Block[];
  features: Feature[];
  gallery: { id: string; url: string; alt: string }[];
  /** Downloads split by sub-folder, in the order they should be shown. */
  attachmentGroups: AttachmentGroup[];
  /** The same files in one flat list, for counting and for the JSON-LD. */
  attachments: AttachmentView[];
  specs: { key: string; label: string; value: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
};

// ---------------------------------------------------------------- helpers

/** Picks one language out of a `{ th: …, en: … }` map, with a sane fallback. */
function pickLocalised(
  value: Localised | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  return value[locale] ?? value[defaultLocale] ?? Object.values(value)[0] ?? null;
}

/**
 * Picks the translation for `locale`, honouring the site's fallback policy.
 * Returns null when the project should not be visible in this language at all.
 */
function pickTranslation(
  translations: Record<string, ProjectTranslationData>,
  locale: Locale,
  fallbackPolicy: "hide" | "fallback",
): { row: ProjectTranslationData; isTranslated: boolean } | null {
  const exact = translations[locale];
  if (exact && exact.isPublished) return { row: exact, isTranslated: true };

  if (fallbackPolicy === "hide") return null;

  const fallback =
    (translations[defaultLocale]?.isPublished
      ? translations[defaultLocale]
      : undefined) ?? Object.values(translations).find((tr) => tr.isPublished);

  return fallback ? { row: fallback, isTranslated: false } : null;
}

function categoryTranslation(category: CategoryData, locale: Locale) {
  return (
    category.translations[locale] ??
    category.translations[defaultLocale] ??
    Object.values(category.translations)[0] ??
    null
  );
}

function resolveCategories(
  project: ProjectData,
  categories: CategoryData[],
  locale: Locale,
): ProjectCategoryView[] {
  return project.categories
    .map((link) => {
      const category = categories.find((c) => c.id === link.id);
      if (!category) return null;
      const tr = categoryTranslation(category, locale);
      if (!tr) return null;
      return {
        id: category.id,
        slug: tr.slug,
        name: tr.name,
        isPrimary: link.isPrimary,
      };
    })
    .filter((c): c is ProjectCategoryView => c !== null);
}

function toListItem(
  project: ProjectData,
  categories: CategoryData[],
  locale: Locale,
  fallbackPolicy: "hide" | "fallback",
): ProjectListItem | null {
  const picked = pickTranslation(project.translations, locale, fallbackPolicy);
  if (!picked) return null;

  return {
    id: project.id,
    slug: picked.row.slug,
    title: picked.row.title,
    summary: picked.row.summary ?? "",
    coverUrl: project.cover ? publicUrl(project.cover.file) : null,
    coverAlt:
      pickLocalised(project.cover?.alt, locale) ?? picked.row.title,
    categories: resolveCategories(project, categories, locale),
    isTranslated: picked.isTranslated,
  };
}

// ---------------------------------------------------------------- queries

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
  const [settings, projects, categories] = await Promise.all([
    getSettings(),
    loadProjects(),
    loadCategories(),
  ]);
  const fallbackPolicy = settings.i18n.contentFallback;

  const wanted = query.categorySlugs?.length
    ? new Set(query.categorySlugs)
    : null;

  const rows = projects
    .filter((p) => p.status === "published")
    .filter((p) => (query.featuredOnly ? p.isFeatured : true))
    .filter((p) => {
      if (!wanted) return true;
      // A category matches on its slug in any language, so a link shared from
      // the Thai site still filters correctly when opened in English.
      return p.categories.some((link) => {
        const category = categories.find((c) => c.id === link.id);
        if (!category || !category.isActive) return false;
        return Object.values(category.translations).some((tr) =>
          wanted.has(tr.slug),
        );
      });
    })
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );

  const mapped: ProjectListItem[] = [];
  for (const row of rows) {
    const item = toListItem(row, categories, locale, fallbackPolicy);
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
  const [settings, projects, categories] = await Promise.all([
    getSettings(),
    loadProjects(),
    loadCategories(),
  ]);
  const fallbackPolicy = settings.i18n.contentFallback;

  // Match the slug in any locale so a shared Thai URL still resolves when the
  // visitor is browsing in English.
  const row = projects.find(
    (p) =>
      p.status === "published" &&
      Object.values(p.translations).some((tr) => tr.slug === slug),
  );
  if (!row) return null;

  const base = toListItem(row, categories, locale, fallbackPolicy);
  if (!base) return null;

  const picked = pickTranslation(row.translations, locale, fallbackPolicy);
  if (!picked) return null;

  const [brochure, gallery, attachmentGroups] = await Promise.all([
    resolveBrochure(row, locale, t),
    resolveGallery(row, locale, picked.row.title),
    resolveAttachments(row, locale, t),
  ]);

  return {
    ...base,
    slug: picked.row.slug,
    // A brochure-only project with no brochure file would render an empty page,
    // so fall back to the typed text.
    infoDisplay: brochure ? row.infoDisplay : "text",
    brochure,
    body: parseBlocks(picked.row.body),
    features: parseFeatures(picked.row.features),
    gallery,
    attachmentGroups,
    attachments: attachmentGroups.flatMap((group) => group.files),
    specs: await resolveSpecs(row, picked.row, locale),
    seoTitle: picked.row.seoTitle,
    seoDescription: picked.row.seoDescription,
  };
}

async function resolveGallery(
  project: ProjectData,
  locale: Locale,
  fallbackAlt: string,
): Promise<{ id: string; url: string; alt: string }[]> {
  const entries = project.cover
    ? [project.cover, ...project.gallery]
    : project.gallery;

  return entries.map((item, index) => ({
    id: `${project.id}-gallery-${index}`,
    url: publicUrl(item.file),
    alt: pickLocalised(item.alt, locale) ?? fallbackAlt,
  }));
}

/**
 * One spelling of a path, for comparing entries that came from JSON against ones
 * that came off the disk. Case and percent-encoding must not make the same file
 * look like two.
 */
function samePathKey(file: string): string {
  let value = file;
  try {
    value = decodeURIComponent(file);
  } catch {
    /* malformed escape — compare the literal string */
  }
  return value.toLowerCase();
}

/**
 * The sub-folder an explicitly listed file sits in, so a hand-written entry lands
 * under the same heading as one that was scanned. Anything outside the project's
 * own folder — a shared file, an external link — belongs to the top-level group.
 */
function groupOfPath(file: string, folder: string): string {
  if (isExternal(file)) return "";
  const prefix = `/files/${folder}/`;
  const decoded = samePathKey(file);
  if (!decoded.startsWith(prefix.toLowerCase())) return "";
  const rest = file.slice(prefix.length);
  const cut = rest.lastIndexOf("/");
  return cut > 0 ? rest.slice(0, cut) : "";
}

/** Heading for a sub-folder: the translated name if one is defined, else as typed. */
function groupHeading(
  key: string,
  labels: Record<string, Localised>,
  locale: Locale,
  t: Translator,
): string {
  if (!key) return t("project.generalFiles");
  const lookup = labels[key.toLowerCase()] ?? labels[key];
  return pickLocalised(lookup, locale) ?? key.split("/").join(" / ");
}

/**
 * Builds the download list for a project.
 *
 * Two sources feed it. Files sitting in `public/files/<folder>/` are picked up
 * automatically, so adding one is a matter of dropping it in; entries written in
 * `projects.json` are still honoured on top, which is how a file gets a
 * hand-written label or how an external link joins the list. Where both describe
 * the same file the JSON entry wins, and anything already shown elsewhere on the
 * page — the cover, the gallery, the brochure — is left out rather than repeated.
 */
async function resolveAttachments(
  project: ProjectData,
  locale: Locale,
  t: Translator,
): Promise<AttachmentGroup[]> {
  const [scanned, groupLabels] = await Promise.all([
    scanProjectFiles(project.folder),
    loadFileGroups(),
  ]);

  const shownElsewhere = new Set(
    [project.cover, ...project.gallery, ...project.brochure]
      .filter((file): file is ProjectFile => Boolean(file))
      .map((file) => samePathKey(file.file)),
  );
  const listedInJson = new Set(project.attachments.map((f) => samePathKey(f.file)));

  type Candidate = { item: ProjectFile; group: string; sizeBytes: number | null };

  const candidates: Candidate[] = project.attachments.map((item) => ({
    item,
    group: groupOfPath(item.file, project.folder),
    sizeBytes: null, // measured below, same as before
  }));

  for (const hit of scanned) {
    const key = samePathKey(hit.file);
    if (listedInJson.has(key) || shownElsewhere.has(key)) continue;
    candidates.push({
      item: { file: hit.file },
      group: hit.group,
      // Already stat'ed during the scan; no need to touch the disk twice.
      sizeBytes: hit.sizeBytes,
    });
  }

  const views = await Promise.all(
    candidates.map(async ({ item, group, sizeBytes }, index): Promise<
      AttachmentView & { group: string }
    > => {
      const fileName = fileNameOf(item.file);
      return {
        id: `${project.id}-attachment-${index}`,
        label:
          pickLocalised(item.label, locale) ??
          // An unlabelled file reads better without its extension repeated —
          // the badge beside it already says what type it is.
          stripExtension(fileName) ??
          t("project.download"),
        fileName,
        url: streamUrl(item.file),
        downloadUrl: streamUrl(item.file, true),
        isExternal: isExternal(item.file),
        mimeType: mimeForFile(item.file),
        sizeBytes: sizeBytes ?? (await fileSize(item.file)),
        group,
      };
    }),
  );

  const byGroup = new Map<string, AttachmentView[]>();
  for (const { group, ...view } of views) {
    const bucket = byGroup.get(group);
    if (bucket) bucket.push(view);
    else byGroup.set(group, [view]);
  }

  const collator = new Intl.Collator([locale, defaultLocale], { numeric: true });
  return [...byGroup.entries()]
    // The top-level group leads; named folders follow in name order.
    .sort(([a], [b]) => (!a ? -1 : !b ? 1 : collator.compare(a, b)))
    .map(([key, files]) => ({
      key,
      label: groupHeading(key, groupLabels, locale, t),
      files,
    }));
}

/** "รายงานประจำปี.pdf" -> "รายงานประจำปี". Returns null for a nameless file. */
function stripExtension(fileName: string | null): string | null {
  if (!fileName) return null;
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/**
 * Picks the brochure for `locale`. Brochures are printed per language, so the
 * lookup is: this language's pages, else pages marked as shared across all
 * languages, else the default language's — showing the wrong-language brochure
 * beats showing nothing, and the caller flags it so the page can say so.
 */
async function resolveBrochure(
  project: ProjectData,
  locale: Locale,
  t: Translator,
): Promise<BrochureView | null> {
  const brochures = project.brochure;
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

  const pages = await Promise.all(
    chosen.map(async (item, index): Promise<BrochurePage> => {
      const mime = mimeForFile(item.file);
      const fileName = fileNameOf(item.file);
      return {
        id: `${project.id}-brochure-${index}`,
        kind: mime?.startsWith("image/") ? "image" : "pdf",
        url: streamUrl(item.file),
        downloadUrl: streamUrl(item.file, true),
        label: pickLocalised(item.label, locale) ?? fileName ?? t("project.brochure"),
        fileName,
        mimeType: mime,
        sizeBytes: await fileSize(item.file),
      };
    }),
  );

  if (!pages.length) return null;

  return {
    pages,
    isTranslated: forLocale.length > 0 || shared.length > 0,
  };
}

/** Renders the custom fields defined in `src/data/fields.json`. */
async function resolveSpecs(
  project: ProjectData,
  translation: ProjectTranslationData,
  locale: Locale,
): Promise<{ key: string; label: string; value: string }[]> {
  const definitions = await getFieldDefinitions("project");
  const shared = project.custom ?? {};
  const localised = translation.custom ?? {};

  const specs: { key: string; label: string; value: string }[] = [];

  for (const def of definitions) {
    if (!def.isActive || !def.showOnDetail) continue;
    const raw = def.isTranslatable ? localised[def.key] : shared[def.key];
    if (raw === undefined || raw === null || raw === "") continue;

    const defTr =
      def.translations[locale] ??
      def.translations[defaultLocale] ??
      Object.values(def.translations)[0];

    let value = String(raw);
    if (def.dataType === "boolean") {
      value = raw ? "✓" : "—";
    } else if (def.dataType === "select") {
      value = defTr?.choiceLabels?.[String(raw)] ?? String(raw);
    }

    if (def.options?.unit) value = `${value} ${def.options.unit}`;

    specs.push({ key: def.key, label: defTr?.label ?? def.key, value });
  }

  return specs;
}

export async function getFieldDefinitions(
  entity: string,
): Promise<FieldData[]> {
  const fields = await loadFields();
  return fields
    .filter((f) => f.entity === entity)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

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
  const [categories, projects] = await Promise.all([
    loadCategories(),
    loadProjects(),
  ]);

  const published = projects.filter((p) => p.status === "published");

  return categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => {
      const tr = categoryTranslation(category, locale);
      if (!tr) return null;
      return {
        id: category.id,
        slug: tr.slug,
        name: tr.name,
        description: tr.description ?? null,
        count: published.filter((p) =>
          p.categories.some((link) => link.id === category.id),
        ).length,
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
export async function getProjectSlugMap(
  projectId: string,
): Promise<Record<string, string>> {
  const projects = await loadProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return {};

  return Object.fromEntries(
    Object.entries(project.translations)
      .filter(([, tr]) => tr.isPublished)
      .map(([locale, tr]) => [locale, tr.slug]),
  );
}

export type { ProjectFile };

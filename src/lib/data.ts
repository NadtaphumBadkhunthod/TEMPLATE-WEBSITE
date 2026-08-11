import { cache } from "react";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * The content store. There is no database: everything the site renders lives in
 * `src/data/*.json`, and every file a project offers lives under
 * `public/files/<project folder>/`.
 *
 * Files are read per request and cached for the duration of that render, so
 * editing a JSON file takes effect on the next request without a rebuild. On a
 * statically exported build the same reads happen once, at build time.
 */

const dataDir = path.join(process.cwd(), "src", "data");
const publicDir = path.join(process.cwd(), "public");

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(dataDir, name), "utf8")) as T;
  } catch {
    // A missing or malformed file must not take the whole site down — the page
    // renders empty instead, and the reason is visible in the server log.
    console.error(`[data] could not read src/data/${name}`);
    return fallback;
  }
}

// ---------------------------------------------------------------- shapes

/** A string carried in every content language, e.g. `{ th: "…", en: "…" }`. */
export type Localised = Record<string, string>;

export type ProjectFile = {
  /** Path under `public/`, e.g. `/files/phuket/quotation.pdf`, or a full URL. */
  file: string;
  label?: Localised;
  alt?: Localised;
  /** Brochures only: which language this copy is for; null = all languages. */
  locale?: string | null;
};

export type ProjectTranslationData = {
  slug: string;
  title: string;
  summary: string | null;
  body: unknown;
  features: unknown;
  custom: Record<string, unknown>;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
};

export type ProjectData = {
  id: string;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  publishedAt: string | null;
  isFeatured: boolean;
  infoDisplay: "text" | "brochure" | "both";
  /** Folder under `public/files/` holding this project's files. */
  folder: string;
  categories: { id: string; isPrimary: boolean }[];
  cover: ProjectFile | null;
  gallery: ProjectFile[];
  brochure: ProjectFile[];
  attachments: ProjectFile[];
  custom: Record<string, unknown>;
  translations: Record<string, ProjectTranslationData>;
};

export type CategoryData = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  translations: Record<
    string,
    { slug: string; name: string; description: string | null }
  >;
};

export type FieldData = {
  entity: string;
  key: string;
  dataType: "text" | "number" | "boolean" | "date" | "select" | "url";
  isTranslatable: boolean;
  isFilterable: boolean;
  showOnCard: boolean;
  showOnDetail: boolean;
  isActive: boolean;
  sortOrder: number;
  options: { unit?: string; choices?: { value: string }[] };
  translations: Record<
    string,
    { label: string; helpText: string | null; choiceLabels: Record<string, string> }
  >;
};

// ---------------------------------------------------------------- loaders

export const loadProjects = cache(() => readJson<ProjectData[]>("projects.json", []));
export const loadCategories = cache(() => readJson<CategoryData[]>("categories.json", []));
export const loadFields = cache(() => readJson<FieldData[]>("fields.json", []));
export const loadSettingsFile = cache(() =>
  readJson<Record<string, unknown>>("settings.json", {}),
);

// ---------------------------------------------------------------- file helpers

/** True for anything that is a link out rather than a file we serve. */
export function isExternal(file: string): boolean {
  return /^https?:\/\//i.test(file);
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  rtf: "application/rtf",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  json: "application/json",
  xml: "application/xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
};

export function mimeForFile(file: string): string | null {
  const ext = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(file)?.[1]?.toLowerCase();
  return ext ? (MIME_BY_EXTENSION[ext] ?? null) : null;
}

export function fileNameOf(file: string): string | null {
  const withoutQuery = file.split(/[?#]/)[0];
  const name = withoutQuery.split("/").pop();
  return name ? decodeURIComponent(name) : null;
}

/**
 * Turns the path written in JSON into one that is safe in an `href`.
 *
 * Paths are stored exactly as the file is named on disk so they stay readable and
 * easy to hand-edit — which means a Thai filename, or one with a space, arrives
 * here unencoded and would produce a broken link. Anything already encoded is left
 * alone so both spellings work.
 */
export function publicUrl(file: string): string {
  if (isExternal(file)) return file;
  const alreadyEncoded = /%[0-9a-f]{2}/i.test(file);
  return alreadyEncoded ? file : encodeURI(file);
}

/**
 * Size of a file living under `public/`. Returns null for external links and for
 * anything missing, so a not-yet-uploaded file degrades to "no size shown"
 * rather than breaking the page.
 */
export async function fileSize(file: string): Promise<number | null> {
  if (isExternal(file)) return null;
  // The JSON may carry either spelling of a non-ASCII name; disk wants the raw one.
  let onDisk = file;
  try {
    onDisk = decodeURIComponent(file);
  } catch {
    /* malformed escape — fall back to the literal string */
  }
  const target = path.resolve(publicDir, `.${onDisk.startsWith("/") ? onDisk : `/${onDisk}`}`);
  // Defence in depth: never stat outside public/, whatever the JSON says.
  const relative = path.relative(publicDir, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  try {
    return (await stat(target)).size;
  } catch {
    return null;
  }
}

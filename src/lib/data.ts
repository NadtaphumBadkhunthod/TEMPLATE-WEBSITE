import { cache } from "react";
import { readdir, readFile, stat } from "node:fs/promises";
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
/** Heading to show for each sub-folder name, per language. */
export const loadFileGroups = cache(() =>
  readJson<Record<string, Localised>>("file-groups.json", {}),
);

// ---------------------------------------------------------------- folder scan

/** A file found on disk under a project's folder rather than listed in JSON. */
export type ScannedFile = {
  /** Path under `public/`, spelled exactly as the file is named on disk. */
  file: string;
  /** Sub-folder it sits in, relative to the project folder; "" = the top level. */
  group: string;
  /** File name, extension included. */
  name: string;
  sizeBytes: number;
};

/** Housekeeping files that live in the folder but are not content. */
const IGNORED_FILES = new Set([".gitkeep", "thumbs.db", "desktop.ini"]);

/**
 * Lists every file under `public/files/<folder>/`, recursively.
 *
 * This is what makes a project's downloads self-maintaining: dropping a file into
 * the folder is the whole job, and whichever sub-folder it lands in becomes the
 * heading it is listed under. A missing folder yields [] rather than an error, so
 * a project that has no files yet still renders.
 */
export const scanProjectFiles = cache(
  async (folder: string): Promise<ScannedFile[]> => {
    // The folder name comes from JSON, so treat it as untrusted input.
    if (!folder || folder.includes("..") || path.isAbsolute(folder)) return [];

    const found: ScannedFile[] = [];

    async function walk(dir: string, group: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return; // the folder does not exist yet — that is not an error
      }

      for (const entry of entries) {
        // Skips .gitkeep and friends, and keeps hidden files out of the site.
        if (entry.name.startsWith(".")) continue;
        if (IGNORED_FILES.has(entry.name.toLowerCase())) continue;

        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full, group ? `${group}/${entry.name}` : entry.name);
          continue;
        }
        if (!entry.isFile()) continue;

        const relative = path.relative(publicDir, full).split(path.sep).join("/");
        found.push({
          file: `/${relative}`,
          group,
          name: entry.name,
          sizeBytes: (await stat(full)).size,
        });
      }
    }

    await walk(path.join(publicDir, "files", folder), "");

    // Top-level files first, then each sub-folder in name order. `numeric` so
    // "หน้า 2" sorts before "หน้า 10" instead of after it.
    const collator = new Intl.Collator(["th", "en"], { numeric: true });
    return found.sort(
      (a, b) =>
        collator.compare(a.group, b.group) || collator.compare(a.name, b.name),
    );
  },
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
 * URL that streams a file out of `public/` through the app instead of serving it
 * as a static asset.
 *
 * `next start` serves `public/` from a listing taken at build time, so a file
 * dropped in afterwards would 404 until the next build. This route reads the disk
 * on every request, which is what lets a newly added file download straight away.
 * Pass `download` to make the browser save it rather than display it.
 */
export function streamUrl(file: string, download = false): string {
  if (isExternal(file)) return file;
  const encoded = publicUrl(file);
  const absolute = encoded.startsWith("/") ? encoded : `/${encoded}`;
  return `/download${absolute}${download ? "?dl=1" : ""}`;
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

import path from "node:path";

export type MediaLike = {
  id: string;
  storageKey: string | null;
  externalUrl: string | null;
};

/** Uploaded files are streamed through an API route so storage stays swappable. */
export function mediaUrl(asset: MediaLike | null | undefined): string | null {
  if (!asset) return null;
  if (asset.externalUrl) return asset.externalUrl;
  if (asset.storageKey) return `/api/media/${asset.id}`;
  return null;
}

export function uploadRoot(): string {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
}

/**
 * Resolves a stored key to an absolute path, refusing anything that escapes the
 * upload directory — storageKey comes from the DB, but defence in depth is
 * cheap and this is the one place a traversal would matter.
 */
export function resolveStoredPath(storageKey: string): string | null {
  const root = uploadRoot();
  const target = path.resolve(root, storageKey);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export function kindForMime(mime: string): "image" | "document" | "video" | "other" {
  if (IMAGE_TYPES.includes(mime)) return "image";
  if (mime.startsWith("video/")) return "video";
  if (
    mime === "application/pdf" ||
    mime.startsWith("application/vnd") ||
    mime.startsWith("application/msword") ||
    mime === "text/plain" ||
    mime === "application/zip"
  ) {
    return "document";
  }
  return "other";
}

export const ALLOWED_UPLOAD_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "application/zip",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Safe, collision-resistant on-disk name; the original is kept in the DB. */
export function storageKeyFor(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 10);
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : "";
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${stamp}-${rand}${safeExt}`;
}

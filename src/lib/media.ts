import path from "node:path";

import { checkUploadAllowed as check, type UploadCheck } from "./file-types";

/*
 * Disk-facing media helpers. Anything pure lives in `file-types.ts` so the
 * client-side media picker can share it — this module imports `node:path` and
 * therefore cannot be pulled into a client component.
 */

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

/** Reads the env escape hatch here so `file-types.ts` stays environment-free. */
export function checkUploadAllowed(fileName: string): UploadCheck {
  return check(fileName, process.env.UPLOAD_ALLOW_ALL_TYPES === "true");
}

/** Configurable so a deployment can raise it without a code change. */
export function maxUploadBytes(): number {
  const configured = Number(process.env.UPLOAD_MAX_MB);
  const megabytes =
    Number.isFinite(configured) && configured > 0 ? configured : 100;
  return Math.floor(megabytes * 1024 * 1024);
}

/** Safe, collision-resistant on-disk name; the original is kept in the DB. */
export function storageKeyFor(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 10);
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : "";
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${stamp}-${rand}${safeExt}`;
}

export {
  extensionLabel,
  extensionOf,
  isInlineSafeMime,
  kindForMime,
  type MediaKindName,
} from "./file-types";

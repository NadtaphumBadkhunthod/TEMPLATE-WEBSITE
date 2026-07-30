/**
 * Pure file-type helpers, deliberately free of any `node:` import so both the
 * server routes and the client-side media picker can use the same logic. The
 * disk-facing half lives in `media.ts`, which cannot be imported from a client
 * component.
 */

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/tiff",
];

export type MediaKindName = "image" | "document" | "video" | "audio" | "other";

export function kindForMime(mime: string): MediaKindName {
  if (IMAGE_TYPES.includes(mime) || mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime === "application/pdf" ||
    mime.startsWith("application/vnd") || // Office, OpenDocument, …
    mime.startsWith("application/msword") ||
    mime.startsWith("text/") ||
    mime === "application/rtf" ||
    mime === "application/zip" ||
    mime === "application/x-7z-compressed" ||
    mime === "application/x-rar-compressed" ||
    mime === "application/x-tar" ||
    mime === "application/gzip" ||
    mime === "application/json" ||
    mime === "application/xml"
  ) {
    return "document";
  }
  return "other";
}

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9-]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

/*
 * Fallback for when there is no filename to read an extension from — an
 * external link, say. Truncating the MIME subtype alone is not good enough:
 * every Office format begins "vnd.openxmlformats-…", which would render as a
 * uselessly identical "VND.O" badge on a Word, Excel and PowerPoint file alike.
 */
const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.oasis.opendocument.text": "ODT",
  "application/vnd.oasis.opendocument.spreadsheet": "ODS",
  "application/vnd.oasis.opendocument.presentation": "ODP",
  "application/rtf": "RTF",
  "application/zip": "ZIP",
  "application/x-7z-compressed": "7Z",
  "application/x-rar-compressed": "RAR",
  "application/x-tar": "TAR",
  "application/gzip": "GZ",
  "application/json": "JSON",
  "application/xml": "XML",
  "text/plain": "TXT",
  "text/csv": "CSV",
  "text/html": "HTML",
  "audio/mpeg": "MP3",
  "audio/wav": "WAV",
  "audio/x-wav": "WAV",
  "audio/ogg": "OGG",
  "audio/mp4": "M4A",
  "audio/aac": "AAC",
  "audio/flac": "FLAC",
  "video/mp4": "MP4",
  "video/quicktime": "MOV",
  "video/x-msvideo": "AVI",
  "video/webm": "WEBM",
  "video/x-matroska": "MKV",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/gif": "GIF",
  "image/webp": "WEBP",
  "image/svg+xml": "SVG",
};

/** Short uppercase badge for the UI, e.g. "PDF", "DOCX", "MP4". */
export function extensionLabel(
  fileName: string | null | undefined,
  mime?: string | null,
): string {
  // The real extension is the most accurate thing available; prefer it.
  const ext = fileName ? extensionOf(fileName) : "";
  if (ext) return ext.toUpperCase();

  if (mime) {
    const mapped = MIME_LABELS[mime.toLowerCase()];
    if (mapped) return mapped;
    const subtype = mime.split("/")[1]?.replace(/^x-/, "").replace(/\+.*$/, "");
    // Only usable if it is short and not one of the vnd.* families.
    if (subtype && subtype.length <= 5 && !subtype.includes(".")) {
      return subtype.toUpperCase();
    }
  }
  return "FILE";
}

/*
 * Uploads are deliberately open-ended: any document, spreadsheet, archive,
 * image, audio or video file is accepted so the admin never has to ask for a
 * code change to attach a new format.
 *
 * What is refused is the narrow set of things that would turn this site into a
 * malware host or let an upload run in our own origin — executables, installers,
 * shell/script files and server-side sources. None of them are plausible project
 * attachments, and a public download link is exactly how such a file gets
 * distributed. Matching is on extension because that is what the browser and the
 * OS act on; the declared MIME type is supplied by the client and cannot be
 * trusted.
 */
const DENIED_EXTENSIONS = new Set([
  // Windows executables and installers
  "exe", "dll", "com", "scr", "cpl", "msi", "msp", "msc", "ocx", "sys", "drv",
  "gadget", "application", "appref-ms", "hta", "cab",
  // Shell and batch
  "bat", "cmd", "ps1", "psm1", "psd1", "vbs", "vbe", "wsf", "wsh", "ws", "sh",
  "bash", "zsh", "csh", "ksh", "run", "bin",
  // Server-side sources a misconfigured host might execute
  "php", "php3", "php4", "php5", "php7", "phtml", "phar", "asp", "aspx", "ashx",
  "asmx", "jsp", "jspx", "jsw", "cgi", "pl", "py", "pyc", "rb", "cfm",
  // Browser-executable
  "js", "mjs", "cjs", "jse", "jar", "class", "swf", "vb", "wasm",
  // Shortcuts, registry and config that execute or reconfigure
  "lnk", "url", "reg", "scf", "inf", "ins", "isp", "job", "pif", "htaccess",
  // Mac/Linux packages
  "app", "dmg", "pkg", "deb", "rpm", "apk", "appimage",
  // Access/database macro containers
  "ade", "adp", "mdb", "mde", "accdb", "accde",
]);

/** Office macro formats — separate so the message can explain the fix. */
const DENIED_MACRO_EXTENSIONS = new Set([
  "docm", "dotm", "xlsm", "xltm", "xlam", "pptm", "potm", "ppam", "ppsm", "sldm",
]);

export type UploadCheck = { ok: true } | { ok: false; reason: string };

export function checkUploadAllowed(
  fileName: string,
  allowAll = false,
): UploadCheck {
  if (allowAll) return { ok: true };

  const ext = extensionOf(fileName);
  if (!ext) {
    // No extension means the browser and the OS have nothing to go on either.
    return {
      ok: false,
      reason: "This file has no extension, so we cannot tell what it is.",
    };
  }
  if (DENIED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      reason: `.${ext} files cannot be uploaded — executables and scripts are blocked. Put it in a .zip if you need to distribute it.`,
    };
  }
  if (DENIED_MACRO_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      reason: `.${ext} contains macros and cannot be uploaded. Save it as .${ext.replace(/m$/, "x")} instead.`,
    };
  }
  return { ok: true };
}

/**
 * Which types may be rendered in the browser tab rather than downloaded.
 * Anything else is served as an attachment, so an uploaded .html or .xml can
 * never execute against our own origin.
 */
export function isInlineSafeMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  if (mime === "application/pdf") return true;
  if (mime === "image/svg+xml") return true; // hardened by CSP in the media route
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/")
  );
}

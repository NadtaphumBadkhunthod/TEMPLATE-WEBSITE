import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { isInlineSafeMime, resolveStoredPath } from "@/lib/media";

/**
 * Streams uploaded media. Going through a route rather than serving the folder
 * statically keeps the storage backend swappable (local disk today, S3 later)
 * without any URL changes, and gives us one place to decide download-vs-inline.
 *
 * `?download=1` always forces a download, whatever the type.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: {
      storageKey: true,
      externalUrl: true,
      mimeType: true,
      originalName: true,
    },
  });

  if (!asset) return notFound();
  if (asset.externalUrl) return NextResponse.redirect(asset.externalUrl);
  if (!asset.storageKey) return notFound();

  const filePath = resolveStoredPath(asset.storageKey);
  if (!filePath) return notFound();

  let size: number;
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return notFound();
    size = stats.size;
  } catch {
    return notFound();
  }

  const mime = asset.mimeType || "application/octet-stream";
  const forceDownload =
    new URL(request.url).searchParams.get("download") === "1";
  const inline = !forceDownload && isInlineSafeMime(mime);

  const headers = new Headers({
    "Content-Type": mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": contentDisposition(
      inline ? "inline" : "attachment",
      asset.originalName || "file",
    ),
    // The stored MIME comes from the uploading browser, so never let a viewer
    // sniff its way to a different (executable) interpretation.
    "X-Content-Type-Options": "nosniff",
    // Lets browsers seek in audio/video instead of refetching from byte 0.
    "Accept-Ranges": "bytes",
  });

  /*
   * Anything we are willing to render in a tab that could carry script — an
   * SVG, or any type we serve as a download but a browser might still preview —
   * gets a lockdown CSP. PDFs, images, audio and video are left alone so the
   * native viewers keep working.
   */
  if (!inline || mime === "image/svg+xml") {
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
  }

  // Range requests: required for scrubbing an mp4/mp3 in the browser player.
  const range = parseRange(request.headers.get("range"), size);

  if (range === "invalid") {
    return new NextResponse("Range not satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  if (range) {
    const length = range.end - range.start + 1;
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    return new NextResponse(toWebStream(filePath, range), {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(size));
  return new NextResponse(toWebStream(filePath), { status: 200, headers });
}

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

function toWebStream(
  filePath: string,
  range?: { start: number; end: number },
): ReadableStream {
  const node = range
    ? createReadStream(filePath, { start: range.start, end: range.end })
    : createReadStream(filePath);
  return Readable.toWeb(node) as unknown as ReadableStream;
}

/**
 * Returns the resolved byte range, `null` when the client did not ask for one,
 * or "invalid" when it asked for something unsatisfiable.
 *
 * Only single ranges are handled — multipart ranges are legal but no browser
 * media player needs them, and answering with the whole file is a valid
 * fallback for anything else.
 */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null | "invalid" {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  let start: number;
  let end: number;

  if (!rawStart) {
    // "bytes=-500" — the final 500 bytes.
    const suffix = Number(rawEnd);
    if (suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid";
  if (start > end || start >= size) return "invalid";

  return { start, end: Math.min(end, size - 1) };
}

/**
 * RFC 6266 / 5987. The bare `filename` is an ASCII fallback for old clients;
 * `filename*` carries the real name, which for this site is very often Thai.
 */
function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

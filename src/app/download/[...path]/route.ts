import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { mimeForFile } from "@/lib/data";

/**
 * Serves the files under `public/files/`.
 *
 * `next start` serves `public/` from a listing taken at build time, so a file
 * dropped into a project folder afterwards would 404 until the next build — which
 * is exactly the surprise this route removes. It reads the disk per request, so a
 * file works the moment it is copied in.
 *
 * `?dl=1` asks the browser to save the file instead of displaying it. Without it
 * the file is served inline, which is what the audio and video players need.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicDir = path.join(process.cwd(), "public");

function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Read the path off the URL rather than the route params: the params are
  // decoded for us, and decoding a name that genuinely contains a "%" twice would
  // corrupt it.
  let relative = url.pathname.replace(/^\/download\/?/, "");
  try {
    relative = decodeURIComponent(relative);
  } catch {
    return notFound();
  }
  if (!relative) return notFound();

  const target = path.resolve(publicDir, relative);
  const inside = path.relative(publicDir, target);

  // Never read outside public/, and only ever from the project file area — the
  // rest of public/ is site chrome and has no business being downloadable.
  if (inside.startsWith("..") || path.isAbsolute(inside)) return notFound();
  if (inside.split(path.sep)[0] !== "files") return notFound();

  let info;
  try {
    info = await stat(target);
  } catch {
    return notFound();
  }
  if (!info.isFile()) return notFound();

  const fileName = path.basename(target);
  const disposition = url.searchParams.get("dl") === "1" ? "attachment" : "inline";

  const headers = new Headers({
    "content-type": mimeForFile(fileName) ?? "application/octet-stream",
    "content-length": String(info.size),
    "accept-ranges": "bytes",
    // The file behind a given URL can be replaced at any time, so revalidate.
    "cache-control": "public, max-age=0, must-revalidate",
    // filename* carries the Thai names correctly; the plain form is the fallback.
    "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });

  // Range requests: without these, seeking in the audio and video players either
  // restarts the file or does nothing at all.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range")?.trim() ?? "");
  if (range && info.size > 0) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= info.size) {
      return new Response(null, {
        status: 416,
        headers: { "content-range": `bytes */${info.size}` },
      });
    }

    headers.set("content-length", String(end - start + 1));
    headers.set("content-range", `bytes ${start}-${end}/${info.size}`);
    return new Response(toWebStream(createReadStream(target, { start, end })), {
      status: 206,
      headers,
    });
  }

  return new Response(toWebStream(createReadStream(target)), { status: 200, headers });
}

function toWebStream(stream: ReturnType<typeof createReadStream>) {
  return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;
}

import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resolveStoredPath } from "@/lib/media";

/**
 * Streams uploaded media. Going through a route rather than serving the folder
 * statically keeps the storage backend swappable (local disk today, S3 later)
 * without any URL changes.
 */
export async function GET(
  _request: Request,
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

  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (asset.externalUrl) {
    return NextResponse.redirect(asset.externalUrl);
  }

  if (!asset.storageKey) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = resolveStoredPath(asset.storageKey);
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const stream = Readable.toWeb(
    createReadStream(filePath),
  ) as unknown as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        asset.originalName || "file",
      )}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

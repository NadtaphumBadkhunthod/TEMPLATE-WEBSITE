import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkUploadAllowed,
  kindForMime,
  maxUploadBytes,
  storageKeyFor,
  uploadRoot,
} from "@/lib/media";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const limit = maxUploadBytes();
  if (file.size > limit) {
    return NextResponse.json(
      {
        error: `"${file.name}" is ${formatMb(file.size)}MB. The limit is ${formatMb(limit)}MB — raise UPLOAD_MAX_MB to allow more.`,
      },
      { status: 413 },
    );
  }

  // Any format is welcome except executables and scripts; see lib/media.ts.
  const allowed = checkUploadAllowed(file.name);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.reason }, { status: 415 });
  }

  const mime = file.type || "application/octet-stream";
  const storageKey = storageKeyFor(file.name);
  const root = uploadRoot();
  const target = path.join(root, storageKey);

  await mkdir(root, { recursive: true });

  try {
    // Streamed rather than buffered via arrayBuffer(): for a 100MB video that
    // would hold a second full copy of the file in memory for no reason.
    await pipeline(
      Readable.fromWeb(file.stream() as never),
      createWriteStream(target),
    );
  } catch {
    await unlink(target).catch(() => {});
    return NextResponse.json(
      { error: `Could not save "${file.name}".` },
      { status: 500 },
    );
  }

  let asset;
  try {
    asset = await db.mediaAsset.create({
      data: {
        kind: kindForMime(mime),
        storageKey,
        originalName: file.name.slice(0, 200),
        mimeType: mime,
        sizeBytes: file.size,
        uploadedById: user.sub,
      },
    });
  } catch {
    // Don't leave an orphaned file on disk if the row could not be written.
    await unlink(target).catch(() => {});
    return NextResponse.json(
      { error: `Could not record "${file.name}".` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: asset.id,
    url: `/api/media/${asset.id}`,
    kind: asset.kind,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  });
}

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);
}

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  kindForMime,
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

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
      { status: 413 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_UPLOAD_TYPES.includes(mime)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mime}` },
      { status: 415 },
    );
  }

  const storageKey = storageKeyFor(file.name);
  const root = uploadRoot();
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, storageKey),
    Buffer.from(await file.arrayBuffer()),
  );

  const asset = await db.mediaAsset.create({
    data: {
      kind: kindForMime(mime),
      storageKey,
      originalName: file.name.slice(0, 200),
      mimeType: mime,
      sizeBytes: file.size,
      uploadedById: user.sub,
    },
  });

  return NextResponse.json({
    id: asset.id,
    url: `/api/media/${asset.id}`,
    kind: asset.kind,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  });
}

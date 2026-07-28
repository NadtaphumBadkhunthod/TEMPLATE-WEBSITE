"use server";

import { unlink } from "node:fs/promises";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveStoredPath } from "@/lib/media";

export async function deleteMedia(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: {
      storageKey: true,
      _count: { select: { projectMedia: true, coverOfProjects: true } },
    },
  });
  if (!asset) return;

  // Referenced media is protected by onDelete: Restrict — bail out early with a
  // no-op rather than surfacing a foreign key error.
  if (asset._count.projectMedia > 0 || asset._count.coverOfProjects > 0) {
    revalidatePath("/admin/media");
    return;
  }

  await db.mediaAsset.delete({ where: { id } });

  if (asset.storageKey) {
    const filePath = resolveStoredPath(asset.storageKey);
    if (filePath) {
      // The DB row is the source of truth; a stale file on disk is harmless.
      await unlink(filePath).catch(() => undefined);
    }
  }

  revalidatePath("/admin/media");
}

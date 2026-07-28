"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type { SaveState } from "@/lib/action-state";

type TranslationInput = {
  slug: string;
  title: string;
  summary: string;
  body: unknown;
  features: unknown;
  custom: Record<string, unknown>;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
};

type ProjectPayload = {
  id?: string;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  sortOrder: number;
  coverMediaId: string | null;
  categoryIds: string[];
  primaryCategoryId: string | null;
  custom: Record<string, unknown>;
  gallery: string[];
  attachments: { mediaId: string; label: string }[];
  translations: Record<string, TranslationInput>;
};

export async function saveProject(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const user = await requireUser();

  let payload: ProjectPayload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { status: "error", message: "Could not read the submitted form." };
  }

  // A project needs a title in at least one language before it can be saved.
  const filled = Object.entries(payload.translations).filter(([, tr]) =>
    tr.title.trim(),
  );
  if (!filled.length) {
    return { status: "error", message: "Add a title in at least one language." };
  }

  const projectData = {
    status: payload.status,
    isFeatured: payload.isFeatured,
    sortOrder: Number.isFinite(payload.sortOrder) ? payload.sortOrder : 0,
    coverMediaId: payload.coverMediaId || null,
    custom: payload.custom as never,
    publishedAt:
      payload.status === "published" ? new Date() : null,
  };

  let projectId = payload.id ?? null;

  try {
    await db.$transaction(async (tx) => {
      if (projectId) {
        // Keep the original publish date instead of bumping it on every save.
        const existing = await tx.project.findUnique({
          where: { id: projectId },
          select: { publishedAt: true },
        });
        await tx.project.update({
          where: { id: projectId },
          data: {
            ...projectData,
            publishedAt:
              payload.status === "published"
                ? (existing?.publishedAt ?? new Date())
                : null,
          },
        });
      } else {
        const created = await tx.project.create({ data: projectData });
        projectId = created.id;
      }

      for (const locale of locales) {
        const tr = payload.translations[locale];
        if (!tr || !tr.title.trim()) {
          // Removing the title removes that language's translation entirely.
          await tx.projectTranslation.deleteMany({
            where: { projectId: projectId!, locale },
          });
          continue;
        }

        const slug = slugify(tr.slug || tr.title) || `project-${Date.now()}`;

        await tx.projectTranslation.upsert({
          where: { projectId_locale: { projectId: projectId!, locale } },
          create: {
            projectId: projectId!,
            locale,
            slug,
            title: tr.title.trim(),
            summary: tr.summary?.trim() || null,
            body: (tr.body ?? []) as never,
            features: (tr.features ?? []) as never,
            custom: (tr.custom ?? {}) as never,
            seoTitle: tr.seoTitle?.trim() || null,
            seoDescription: tr.seoDescription?.trim() || null,
            isPublished: tr.isPublished,
          },
          update: {
            slug,
            title: tr.title.trim(),
            summary: tr.summary?.trim() || null,
            body: (tr.body ?? []) as never,
            features: (tr.features ?? []) as never,
            custom: (tr.custom ?? {}) as never,
            seoTitle: tr.seoTitle?.trim() || null,
            seoDescription: tr.seoDescription?.trim() || null,
            isPublished: tr.isPublished,
          },
        });
      }

      // Categories and media links are small sets — replacing them wholesale is
      // simpler and less error-prone than diffing.
      await tx.projectCategory.deleteMany({ where: { projectId: projectId! } });
      if (payload.categoryIds.length) {
        await tx.projectCategory.createMany({
          data: payload.categoryIds.map((categoryId, index) => ({
            projectId: projectId!,
            categoryId,
            isPrimary:
              categoryId ===
              (payload.primaryCategoryId ?? payload.categoryIds[0]),
            sortOrder: index,
          })),
        });
      }

      await tx.projectMedia.deleteMany({ where: { projectId: projectId! } });
      const links = [
        ...payload.gallery.map((mediaId, index) => ({
          projectId: projectId!,
          mediaId,
          role: "gallery" as const,
          sortOrder: index,
          isPublic: true,
          label: null,
        })),
        ...payload.attachments.map((attachment, index) => ({
          projectId: projectId!,
          mediaId: attachment.mediaId,
          role: "attachment" as const,
          sortOrder: index,
          isPublic: true,
          label: attachment.label?.trim() || null,
        })),
      ];
      if (links.length) {
        await tx.projectMedia.createMany({ data: links, skipDuplicates: true });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: payload.id ? "update" : "create",
          entity: "project",
          entityId: projectId,
        },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "That slug is already used by another project in the same language."
        : "Could not save the project. Please check the fields and try again.";
    return { status: "error", message };
  }

  revalidatePath("/admin/projects");
  revalidatePath("/", "layout");

  if (!payload.id && projectId) {
    redirect(`/admin/projects/${projectId}?created=1`);
  }

  return { status: "saved", message: null };
}

export async function deleteProject(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.project.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: user.sub, action: "delete", entity: "project", entityId: id },
  });

  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function toggleProjectStatus(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("status") ?? "");
  if (!id || !["draft", "published", "archived"].includes(next)) return;

  await db.project.update({
    where: { id },
    data: {
      status: next as "draft" | "published" | "archived",
      publishedAt: next === "published" ? new Date() : null,
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath("/", "layout");
}

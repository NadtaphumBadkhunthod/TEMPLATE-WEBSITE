"use server";

import { revalidatePath } from "next/cache";

import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type { CategoryState } from "@/lib/action-state";

export async function saveCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const isActive = formData.get("isActive") === "on";
  const parentId = String(formData.get("parentId") ?? "") || null;

  const names: Record<string, string> = {};
  const slugs: Record<string, string> = {};
  const descriptions: Record<string, string> = {};

  for (const locale of locales) {
    names[locale] = String(formData.get(`name_${locale}`) ?? "").trim();
    slugs[locale] = String(formData.get(`slug_${locale}`) ?? "").trim();
    descriptions[locale] = String(
      formData.get(`description_${locale}`) ?? "",
    ).trim();
  }

  if (!Object.values(names).some(Boolean)) {
    return { error: "Enter a name in at least one language.", ok: false };
  }

  try {
    await db.$transaction(async (tx) => {
      const category = id
        ? await tx.category.update({
            where: { id },
            data: { sortOrder, isActive, parentId },
          })
        : await tx.category.create({
            data: { sortOrder, isActive, parentId },
          });

      for (const locale of locales) {
        const name = names[locale];
        if (!name) {
          await tx.categoryTranslation.deleteMany({
            where: { categoryId: category.id, locale },
          });
          continue;
        }

        const slug = slugify(slugs[locale] || name) || `category-${Date.now()}`;

        await tx.categoryTranslation.upsert({
          where: {
            categoryId_locale: { categoryId: category.id, locale },
          },
          create: {
            categoryId: category.id,
            locale,
            name,
            slug,
            description: descriptions[locale] || null,
          },
          update: {
            name,
            slug,
            description: descriptions[locale] || null,
          },
        });
      }
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "That slug is already used by another category."
        : "Could not save the category.";
    return { error: message, ok: false };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function deleteCategory(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Categories in use are protected by an onDelete: Restrict foreign key —
  // surface that as a readable message rather than a 500.
  const inUse = await db.projectCategory.count({ where: { categoryId: id } });
  if (inUse > 0) {
    revalidatePath("/admin/categories");
    return;
  }

  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

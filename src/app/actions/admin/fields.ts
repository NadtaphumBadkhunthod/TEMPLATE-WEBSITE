"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

const DATA_TYPES = ["text", "number", "boolean", "date", "select", "url"] as const;

/**
 * Creates or updates a custom project field. This is the escape hatch that lets
 * an admin add a domain-specific attribute without a schema migration.
 */
export async function saveFieldDefinition(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const rawKey = String(formData.get("key") ?? "").trim();
  const key = slugify(rawKey).replace(/-/g, "_");
  const dataType = String(formData.get("dataType") ?? "text");

  if (!key || !(DATA_TYPES as readonly string[]).includes(dataType)) {
    redirect("/admin/fields?error=invalid");
  }

  const choices = String(formData.get("choices") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((value) => ({ value }));

  const data = {
    entity: "project",
    key,
    dataType: dataType as (typeof DATA_TYPES)[number],
    isTranslatable: formData.get("isTranslatable") === "on",
    isFilterable: formData.get("isFilterable") === "on",
    showOnDetail: formData.get("showOnDetail") === "on",
    isActive: formData.get("isActive") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    options: { choices } as never,
  };

  try {
    const field = id
      ? await db.fieldDefinition.update({ where: { id }, data })
      : await db.fieldDefinition.create({ data });

    for (const locale of locales) {
      const label = String(formData.get(`label_${locale}`) ?? "").trim();
      if (!label) continue;

      const choiceLabels: Record<string, string> = {};
      for (const choice of choices) {
        const value = String(
          formData.get(`choice_${locale}_${choice.value}`) ?? "",
        ).trim();
        choiceLabels[choice.value] = value || choice.value;
      }

      await db.fieldDefinitionTranslation.upsert({
        where: {
          fieldDefinitionId_locale: { fieldDefinitionId: field.id, locale },
        },
        create: {
          fieldDefinitionId: field.id,
          locale,
          label,
          helpText: String(formData.get(`help_${locale}`) ?? "").trim() || null,
          choiceLabels: choiceLabels as never,
        },
        update: {
          label,
          helpText: String(formData.get(`help_${locale}`) ?? "").trim() || null,
          choiceLabels: choiceLabels as never,
        },
      });
    }
  } catch {
    redirect("/admin/fields?error=duplicate");
  }

  revalidatePath("/admin/fields");
  revalidatePath("/", "layout");
  redirect("/admin/fields?saved=1");
}

export async function deleteFieldDefinition(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Values already stored on projects are left untouched — deleting the
  // definition only stops the field being displayed and edited.
  await db.fieldDefinition.delete({ where: { id } });
  revalidatePath("/admin/fields");
  revalidatePath("/", "layout");
}

import { notFound } from "next/navigation";

import {
  ProjectEditor,
  type ProjectDraft,
  type TranslationDraft,
} from "@/components/admin/ProjectEditor";
import { locales } from "@/i18n/config";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { parseBlocks, parseFeatures } from "@/lib/blocks";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

function emptyTranslation(): TranslationDraft {
  return {
    slug: "",
    title: "",
    summary: "",
    body: [],
    features: [],
    custom: {},
    seoTitle: "",
    seoDescription: "",
    isPublished: false,
    brochure: [],
  };
}

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const adminLocale = await getAdminLocale();

  const isNew = id === "new";

  const [project, categoryRows, mediaRows, fieldRows] = await Promise.all([
    isNew
      ? null
      : db.project.findUnique({
          where: { id },
          include: {
            translations: true,
            categories: true,
            media: true,
          },
        }),
    db.category.findMany({
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.fieldDefinition.findMany({
      where: { entity: "project", isActive: true },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!isNew && !project) notFound();

  const translations: Record<string, TranslationDraft> = {};
  for (const locale of locales) {
    const row = project?.translations.find((tr) => tr.locale === locale);
    translations[locale] = row
      ? {
          slug: row.slug,
          title: row.title,
          summary: row.summary ?? "",
          body: parseBlocks(row.body),
          features: parseFeatures(row.features),
          custom: (row.custom ?? {}) as Record<string, unknown>,
          seoTitle: row.seoTitle ?? "",
          seoDescription: row.seoDescription ?? "",
          isPublished: row.isPublished,
          brochure:
            project?.media
              .filter((m) => m.role === "brochure" && m.locale === locale)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((m) => m.mediaId) ?? [],
        }
      : emptyTranslation();
  }

  const initial: ProjectDraft = {
    id: project?.id,
    status: (project?.status ?? "draft") as ProjectDraft["status"],
    isFeatured: project?.isFeatured ?? false,
    sortOrder: project?.sortOrder ?? 0,
    infoDisplay: (project?.infoDisplay ??
      "text") as ProjectDraft["infoDisplay"],
    coverMediaId: project?.coverMediaId ?? null,
    categoryIds: project?.categories.map((link) => link.categoryId) ?? [],
    primaryCategoryId:
      project?.categories.find((link) => link.isPrimary)?.categoryId ?? null,
    custom: (project?.custom ?? {}) as Record<string, unknown>,
    gallery:
      project?.media
        .filter((m) => m.role === "gallery")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => m.mediaId) ?? [],
    attachments:
      project?.media
        .filter((m) => m.role === "attachment")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => ({ mediaId: m.mediaId, label: m.label ?? "" })) ?? [],
    translations,
  };

  const categories = categoryRows.map((row) => ({
    id: row.id,
    name:
      row.translations.find((tr) => tr.locale === adminLocale)?.name ??
      row.translations[0]?.name ??
      "(unnamed)",
  }));

  const mediaAssets = mediaRows.map((row) => ({
    id: row.id,
    url: mediaUrl(row) ?? "",
    kind: row.kind,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
  }));

  const fields = fieldRows.map((row) => {
    const tr =
      row.translations.find((x) => x.locale === adminLocale) ??
      row.translations[0];
    const labels = (tr?.choiceLabels ?? {}) as Record<string, string>;
    const choices =
      ((row.options as { choices?: { value: string }[] } | null)?.choices ?? []).map(
        (choice) => ({
          value: choice.value,
          label: labels[choice.value] ?? choice.value,
        }),
      );
    return {
      key: row.key,
      label: tr?.label ?? row.key,
      dataType: row.dataType,
      isTranslatable: row.isTranslatable,
      helpText: tr?.helpText ?? "",
      choices,
    };
  });

  return (
    <ProjectEditor
      initial={initial}
      categories={categories}
      mediaAssets={mediaAssets}
      fields={fields}
    />
  );
}

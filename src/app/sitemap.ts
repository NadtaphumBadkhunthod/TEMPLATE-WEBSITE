import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const entries: MetadataRoute.Sitemap = [];

  let settings;
  let projects: { locale: string; slug: string; updatedAt: Date }[] = [];
  let categories: { locale: string; slug: string }[] = [];

  try {
    settings = await getSettings();
    projects = await db.projectTranslation.findMany({
      where: { isPublished: true, project: { status: "published" } },
      select: { locale: true, slug: true, updatedAt: true },
    });
    categories = await db.categoryTranslation.findMany({
      where: { category: { isActive: true } },
      select: { locale: true, slug: true },
    });
  } catch {
    // No database yet — still emit the static routes so the file is valid.
    return locales.map((locale) => ({
      url: `${base}/${locale}`,
      changeFrequency: "weekly" as const,
      priority: 1,
    }));
  }

  for (const locale of locales) {
    entries.push({
      url: `${base}/${locale}`,
      changeFrequency: "weekly",
      priority: 1,
    });
    entries.push({
      url: `${base}/${locale}/projects`,
      changeFrequency: "weekly",
      priority: 0.9,
    });
    if (settings.modules.quote) {
      entries.push({
        url: `${base}/${locale}/quote`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  for (const project of projects) {
    entries.push({
      url: `${base}/${project.locale}/projects/${project.slug}`,
      lastModified: project.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const category of categories) {
    entries.push({
      url: `${base}/${category.locale}/projects?category=${encodeURIComponent(category.slug)}`,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}

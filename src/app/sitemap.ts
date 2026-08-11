import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { loadCategories, loadProjects } from "@/lib/data";

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

  const [projects, categories] = await Promise.all([
    loadProjects(),
    loadCategories(),
  ]);

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
  }

  for (const project of projects) {
    if (project.status !== "published") continue;
    for (const [locale, translation] of Object.entries(project.translations)) {
      if (!translation.isPublished) continue;
      entries.push({
        url: `${base}/${locale}/projects/${translation.slug}`,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  for (const category of categories) {
    if (!category.isActive) continue;
    for (const [locale, translation] of Object.entries(category.translations)) {
      entries.push({
        url: `${base}/${locale}/projects?category=${encodeURIComponent(translation.slug)}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}

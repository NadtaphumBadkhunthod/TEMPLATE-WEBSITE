"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { locales } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function savePricingPlan(formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const amountRaw = String(formData.get("priceAmount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;

  const data = {
    priceDisplayMode: String(
      formData.get("priceDisplayMode") ?? "exact",
    ) as "hidden" | "exact" | "from" | "range" | "on_request",
    priceAmount: amount !== null && Number.isFinite(amount) ? amount : null,
    priceCurrency:
      String(formData.get("priceCurrency") ?? "").trim().toUpperCase() || null,
    billingPeriod: String(formData.get("billingPeriod") ?? "").trim() || null,
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };

  const plan = id
    ? await db.pricingPlan.update({ where: { id }, data })
    : await db.pricingPlan.create({ data });

  for (const locale of locales) {
    const name = String(formData.get(`name_${locale}`) ?? "").trim();
    if (!name) {
      await db.pricingPlanTranslation.deleteMany({
        where: { pricingPlanId: plan.id, locale },
      });
      continue;
    }

    const features = String(formData.get(`features_${locale}`) ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        line.startsWith("-")
          ? { text: line.slice(1).trim(), included: false }
          : { text: line, included: true },
      );

    const payload = {
      name,
      tagline: String(formData.get(`tagline_${locale}`) ?? "").trim() || null,
      features: features as never,
      ctaLabel: String(formData.get(`cta_${locale}`) ?? "").trim() || null,
      ctaUrl: String(formData.get(`ctaUrl_${locale}`) ?? "").trim() || null,
    };

    await db.pricingPlanTranslation.upsert({
      where: { pricingPlanId_locale: { pricingPlanId: plan.id, locale } },
      create: { pricingPlanId: plan.id, locale, ...payload },
      update: payload,
    });
  }

  revalidatePath("/admin/pricing");
  revalidatePath("/", "layout");
  redirect("/admin/pricing?saved=1");
}

export async function deletePricingPlan(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.pricingPlan.delete({ where: { id } });
  revalidatePath("/admin/pricing");
  revalidatePath("/", "layout");
}

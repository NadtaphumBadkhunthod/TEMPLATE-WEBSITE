"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getTranslator } from "@/i18n";
import { toLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { QUOTE_FORM_KEY, getForm, validateSubmission } from "@/lib/forms";
import { getSettings } from "@/lib/settings";
import type { QuoteFormState } from "@/lib/action-state";

/** Very small in-process throttle. Swap for Redis/Turnstile before production. */
const submissions = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  submissions.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function submitQuote(
  _prev: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const locale = toLocale(String(formData.get("__locale") ?? ""));
  const t = getTranslator(locale);
  const settings = await getSettings();

  if (!settings.modules.quote) {
    return { status: "error", errors: {}, message: t("quote.unavailable") };
  }

  // Bots fill hidden fields; humans don't. Silently accept so they don't retry.
  if (String(formData.get("website") ?? "")) {
    redirect(`/${locale}/quote/thank-you`);
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return { status: "error", errors: {}, message: t("quote.errorGeneric") };
  }

  const form = await getForm(QUOTE_FORM_KEY, locale);
  if (!form) {
    return { status: "error", errors: {}, message: t("quote.unavailable") };
  }

  const raw: Record<string, string> = {};
  for (const field of form.fields) {
    raw[field.key] = String(formData.get(field.key) ?? "");
  }

  const result = validateSubmission(form, raw, {
    required: t("quote.errorRequired"),
    email: t("quote.errorEmail"),
  });

  if (!result.ok) {
    const errors: Record<string, string> = {};
    for (const error of result.errors) errors[error.key] = error.message;
    return { status: "error", errors, message: null };
  }

  // The project reference is a first-class column, not a form field, because
  // the detail page pre-fills it via the query string.
  const projectSlug = String(formData.get("projectSlug") ?? "").trim();
  let projectId: string | null = null;
  if (projectSlug) {
    const translation = await db.projectTranslation.findFirst({
      where: { slug: projectSlug },
      select: { projectId: true },
    });
    projectId = translation?.projectId ?? null;
  }

  try {
    await db.quoteRequest.create({
      data: {
        formId: form.id,
        locale,
        projectId,
        name: result.value.columns.name || "—",
        email: (result.value.columns.email || "").toLowerCase(),
        phone: result.value.columns.phone,
        message: result.value.columns.message,
        data: result.value.data as never,
        fieldSnapshot: result.value.snapshot as never,
        sourceUrl: headerList.get("referer") ?? null,
        userAgent: headerList.get("user-agent")?.slice(0, 500) ?? null,
        ipAddress: ip.slice(0, 100),
      },
    });
  } catch {
    return { status: "error", errors: {}, message: t("quote.errorGeneric") };
  }

  // TODO: notify settings.quote.notifyEmails once an email provider is wired up.
  redirect(`/${locale}/quote/thank-you`);
}

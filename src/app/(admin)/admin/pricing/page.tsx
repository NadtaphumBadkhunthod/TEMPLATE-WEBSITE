import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deletePricingPlan,
  savePricingPlan,
} from "@/app/actions/admin/pricing";
import { getTranslator } from "@/i18n";
import { localeLabels, locales } from "@/i18n/config";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const settings = await getSettings();
  if (!settings.modules.pricing) notFound();

  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const query = await searchParams;
  const editId = typeof query.edit === "string" ? query.edit : null;

  const plans = await db.pricingPlan.findMany({
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });

  const editing = editId ? plans.find((plan) => plan.id === editId) : null;

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">{t("admin.pricing")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        Plans shown on the pricing page. Turn the whole module off in Settings.
      </p>

      {query.saved && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Saved.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="overflow-hidden rounded-[--radius-card] border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {plans.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-ink-500">
                    {t("admin.noData")}
                  </td>
                </tr>
              )}
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pricing?edit=${plan.id}`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {plan.translations.find((tr) => tr.locale === locale)
                        ?.name ??
                        plan.translations[0]?.name ??
                        "(unnamed)"}
                    </Link>
                    {plan.isFeatured && (
                      <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-800">
                        featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {plan.priceAmount === null
                      ? plan.priceDisplayMode
                      : `${plan.priceAmount} ${plan.priceCurrency ?? ""}`}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {plan.isActive ? "yes" : "no"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deletePricingPlan} className="inline">
                      <input type="hidden" name="id" value={plan.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        {t("common.delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          action={savePricingPlan}
          key={editing?.id ?? "new"}
          className="rounded-[--radius-card] border border-ink-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              {editing ? "Edit plan" : "New plan"}
            </h2>
            {editing && (
              <Link
                href="/admin/pricing"
                className="text-xs text-ink-500 hover:text-ink-800"
              >
                New instead
              </Link>
            )}
          </div>

          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Display</label>
                <select
                  name="priceDisplayMode"
                  defaultValue={editing?.priceDisplayMode ?? "exact"}
                  className={inputClass}
                >
                  {["exact", "from", "on_request", "hidden"].map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Billing</label>
                <select
                  name="billingPeriod"
                  defaultValue={editing?.billingPeriod ?? ""}
                  className={inputClass}
                >
                  <option value="">—</option>
                  <option value="one_time">one_time</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Amount</label>
                <input
                  name="priceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    editing?.priceAmount === null ||
                    editing?.priceAmount === undefined
                      ? ""
                      : String(editing.priceAmount)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <input
                  name="priceCurrency"
                  maxLength={3}
                  defaultValue={editing?.priceCurrency ?? "THB"}
                  className={inputClass}
                />
              </div>
            </div>

            {locales.map((code) => {
              const tr = editing?.translations.find((x) => x.locale === code);
              const features = Array.isArray(tr?.features)
                ? (tr.features as { text?: string; included?: boolean }[])
                : [];
              return (
                <fieldset key={code} className="space-y-2">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {localeLabels[code]}
                  </legend>
                  <input
                    name={`name_${code}`}
                    defaultValue={tr?.name ?? ""}
                    placeholder="Plan name"
                    className={inputClass}
                  />
                  <input
                    name={`tagline_${code}`}
                    defaultValue={tr?.tagline ?? ""}
                    placeholder="Tagline"
                    className={inputClass}
                  />
                  <textarea
                    name={`features_${code}`}
                    rows={4}
                    defaultValue={features
                      .map((f) =>
                        f.included === false ? `-${f.text}` : (f.text ?? ""),
                      )
                      .join("\n")}
                    placeholder={"One feature per line\nPrefix with - for excluded"}
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name={`cta_${code}`}
                      defaultValue={tr?.ctaLabel ?? ""}
                      placeholder="Button label"
                      className={inputClass}
                    />
                    <input
                      name={`ctaUrl_${code}`}
                      defaultValue={tr?.ctaUrl ?? ""}
                      placeholder="Button URL"
                      className={inputClass}
                    />
                  </div>
                </fieldset>
              );
            })}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={editing?.isFeatured ?? false}
                  className="size-4 rounded border-ink-300 text-brand-600"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing?.isActive ?? true}
                  className="size-4 rounded border-ink-300 text-brand-600"
                />
                Active
              </label>
              <label className="ml-auto flex items-center gap-2 text-sm text-ink-700">
                Order
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={editing?.sortOrder ?? 0}
                  className="w-16 rounded border border-ink-300 px-2 py-1 text-sm"
                />
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";
const labelClass = "mb-1.5 block text-xs font-medium text-ink-700";

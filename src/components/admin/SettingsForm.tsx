"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveSettings } from "@/app/actions/admin/settings";
import {
  initialSettingsState,
  type SettingsState,
} from "@/lib/action-state";
import { localeLabels, locales } from "@/i18n/config";
import type { LocalisedString, SiteSettings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState<SettingsState, FormData>(
    saveSettings,
    initialSettingsState,
  );

  return (
    <form action={action} className="mt-6 max-w-3xl space-y-6">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Settings saved.
        </p>
      )}

      <Panel title="Modules" hint="Optional parts of the site">
        <div className="space-y-3">
          <Toggle
            name="module_pricing"
            defaultChecked={settings.modules.pricing}
            label="Pricing page"
            hint="Adds /pricing and shows prices on project pages."
          />
          <Toggle
            name="module_quote"
            defaultChecked={settings.modules.quote}
            label="Request a quote"
            hint="Adds the quote form and its call-to-action buttons."
          />
        </div>
      </Panel>

      <Panel title="Site">
        <LocalisedField
          prefix="site_name"
          label="Site name"
          value={settings.site.name}
        />
        <LocalisedField
          prefix="site_tagline"
          label="Tagline"
          value={settings.site.tagline}
        />
      </Panel>

      <Panel title="Homepage hero">
        <LocalisedField
          prefix="hero_title"
          label="Headline"
          value={settings.hero.title}
        />
        <LocalisedField
          prefix="hero_subtitle"
          label="Sub-headline"
          value={settings.hero.subtitle}
          multiline
        />
        <LocalisedField
          prefix="hero_cta"
          label="Button label"
          value={settings.hero.ctaLabel}
        />
      </Panel>

      <Panel title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input
              name="contact_email"
              type="email"
              defaultValue={settings.contact.email}
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              name="contact_phone"
              defaultValue={settings.contact.phone}
              className={inputClass}
            />
          </Field>
        </div>
        <LocalisedField
          prefix="contact_address"
          label="Address"
          value={settings.contact.address}
          multiline
        />
        <Field
          label="Quote notification recipients"
          hint="Comma-separated. Wire up an email provider to activate."
        >
          <input
            name="notify_emails"
            defaultValue={settings.quote.notifyEmails.join(", ")}
            className={inputClass}
          />
        </Field>
      </Panel>

      <Panel title="Language handling">
        <Field
          label="When a project has no translation for a language"
          hint="'Hide' keeps each language strictly separate; 'fall back' always shows something."
        >
          <select
            name="content_fallback"
            defaultValue={settings.i18n.contentFallback}
            className={inputClass}
          >
            <option value="fallback">Fall back to the other language</option>
            <option value="hide">Hide the project in that language</option>
          </select>
        </Field>
      </Panel>

      <Panel title="Default SEO">
        <LocalisedField
          prefix="seo_title"
          label="Default title"
          value={settings.seo.defaultTitle}
        />
        <LocalisedField
          prefix="seo_description"
          label="Default description"
          value={settings.seo.defaultDescription}
          multiline
        />
      </Panel>

      <Submit />
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[--radius-card] border border-ink-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function LocalisedField({
  prefix,
  label,
  value,
  multiline,
}: {
  prefix: string;
  label: string;
  value: LocalisedString;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-700">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {locales.map((code) => (
          <div key={code}>
            {multiline ? (
              <textarea
                name={`${prefix}_${code}`}
                defaultValue={value[code] ?? ""}
                rows={2}
                className={inputClass}
              />
            ) : (
              <input
                name={`${prefix}_${code}`}
                defaultValue={value[code] ?? ""}
                className={inputClass}
              />
            )}
            <p className="mt-1 text-[11px] text-ink-400">
              {localeLabels[code]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-ink-300 text-brand-600"
      />
      <span>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        <span className="block text-xs text-ink-500">{hint}</span>
      </span>
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

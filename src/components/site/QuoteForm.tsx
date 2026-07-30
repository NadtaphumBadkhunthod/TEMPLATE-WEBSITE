"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitQuote } from "@/app/actions/quote";
import {
  initialQuoteState,
  type QuoteFormState,
} from "@/lib/action-state";
import type { FormFieldView } from "@/lib/forms";
import type { Locale } from "@/i18n/config";

type ProjectOption = { slug: string; title: string };

export function QuoteForm({
  locale,
  fields,
  projects,
  selectedProject,
  labels,
}: {
  locale: Locale;
  fields: FormFieldView[];
  projects: ProjectOption[];
  selectedProject: string;
  labels: {
    submit: string;
    submitting: string;
    projectOfInterest: string;
    generalEnquiry: string;
    required: string;
  };
}) {
  const [state, formAction] = useActionState<QuoteFormState, FormData>(
    submitQuote,
    initialQuoteState,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="__locale" value={locale} />

      {/* Honeypot — hidden from users, irresistible to bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.message && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {projects.length > 0 && (
          <Field
            label={labels.projectOfInterest}
            htmlFor="projectSlug"
            className="sm:col-span-2"
          >
            <select
              id="projectSlug"
              name="projectSlug"
              defaultValue={selectedProject}
              className={inputClass}
            >
              <option value="">{labels.generalEnquiry}</option>
              {projects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.title}
                </option>
              ))}
            </select>
          </Field>
        )}

        {fields.map((field) => (
          <Field
            key={field.id}
            label={field.label}
            htmlFor={field.key}
            required={field.required}
            requiredLabel={labels.required}
            help={field.helpText}
            error={state.errors[field.key]}
            className={field.width === "half" ? "" : "sm:col-span-2"}
          >
            <FieldInput field={field} invalid={!!state.errors[field.key]} />
          </Field>
        ))}
      </div>

      <SubmitButton idle={labels.submit} busy={labels.submitting} />
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const invalidClass = "border-red-400 focus:border-red-500 focus:ring-red-100";

function FieldInput({
  field,
  invalid,
}: {
  field: FormFieldView;
  invalid: boolean;
}) {
  const className = `${inputClass} ${invalid ? invalidClass : ""}`;
  const describedBy = invalid ? `${field.key}-error` : undefined;

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        name={field.key}
        rows={5}
        placeholder={field.placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={className}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        id={field.key}
        name={field.key}
        defaultValue=""
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={className}
      >
        <option value="">—</option>
        {field.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox" || field.type === "consent") {
    return (
      <label className="flex items-start gap-2.5 text-sm text-ink-600">
        <input
          id={field.key}
          name={field.key}
          type="checkbox"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
        />
        <span>{field.placeholder || field.helpText}</span>
      </label>
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "tel"
        ? "tel"
        : field.type === "number"
          ? "number"
          : field.type === "date"
            ? "date"
            : "text";

  return (
    <input
      id={field.key}
      name={field.key}
      type={inputType}
      placeholder={field.placeholder}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={className}
    />
  );
}

function Field({
  label,
  htmlFor,
  required,
  requiredLabel,
  help,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  requiredLabel?: string;
  help?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-ink-800"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-600" title={requiredLabel}>
            *
          </span>
        )}
      </label>
      {children}
      {help && !error && <p className="mt-1.5 text-xs text-ink-500">{help}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? busy : idle}
    </button>
  );
}

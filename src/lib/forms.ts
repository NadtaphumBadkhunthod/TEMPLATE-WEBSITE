import { db } from "./db";
import { defaultLocale, type Locale } from "@/i18n/config";

export const QUOTE_FORM_KEY = "quote_request";

export type FormFieldView = {
  id: string;
  key: string;
  type:
    | "text"
    | "textarea"
    | "email"
    | "tel"
    | "number"
    | "select"
    | "checkbox"
    | "date"
    | "consent";
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  width: "full" | "half";
  choices: { value: string; label: string }[];
  mapsToColumn: string | null;
  validation: { minLength?: number; maxLength?: number; pattern?: string };
};

export type FormView = {
  id: string;
  key: string;
  fields: FormFieldView[];
};

/**
 * Reads the admin-defined form for a locale. Everything the public form renders
 * comes from here — adding a field in the admin needs no code change.
 */
export async function getForm(
  key: string,
  locale: Locale,
): Promise<FormView | null> {
  const form = await db.form.findUnique({
    where: { key },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { translations: true },
      },
    },
  });

  if (!form || !form.isActive) return null;

  const fields: FormFieldView[] = form.fields.map((field) => {
    const tr =
      field.translations.find((t) => t.locale === locale) ??
      field.translations.find((t) => t.locale === defaultLocale) ??
      field.translations[0];

    const choiceLabels = (tr?.choiceLabels ?? {}) as Record<string, string>;
    const rawChoices =
      ((field.options as { choices?: { value: string }[] } | null)?.choices ??
        []) as { value: string }[];

    return {
      id: field.id,
      key: field.key,
      type: field.fieldType as FormFieldView["type"],
      label: tr?.label ?? field.key,
      placeholder: tr?.placeholder ?? "",
      helpText: tr?.helpText ?? "",
      required: field.isRequired,
      width: field.width === "half" ? "half" : "full",
      choices: rawChoices.map((choice) => ({
        value: choice.value,
        label: choiceLabels[choice.value] ?? choice.value,
      })),
      mapsToColumn: field.mapsToColumn,
      validation: (field.validation ?? {}) as FormFieldView["validation"],
    };
  });

  return { id: form.id, key: form.key, fields };
}

export type FieldError = { key: string; message: string };

export type ValidatedSubmission = {
  columns: { name: string; email: string; phone?: string; message?: string };
  data: Record<string, unknown>;
  snapshot: {
    key: string;
    label: string;
    type: string;
    value: unknown;
  }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a submission against the *current* field definitions and produces
 * both the column values and the snapshot that gets frozen onto the record.
 */
export function validateSubmission(
  form: FormView,
  raw: Record<string, string>,
  messages: { required: string; email: string },
): { ok: true; value: ValidatedSubmission } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const columns: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  const snapshot: ValidatedSubmission["snapshot"] = [];

  for (const field of form.fields) {
    const input = (raw[field.key] ?? "").trim();

    if (field.type === "consent" || field.type === "checkbox") {
      const checked = input === "on" || input === "true";
      if (field.required && !checked) {
        errors.push({ key: field.key, message: messages.required });
      }
      snapshot.push({
        key: field.key,
        label: field.label,
        type: field.type,
        value: checked,
      });
      if (field.mapsToColumn) columns[field.mapsToColumn] = String(checked);
      else data[field.key] = checked;
      continue;
    }

    if (!input) {
      if (field.required) {
        errors.push({ key: field.key, message: messages.required });
      }
      // Skip empty optional fields entirely rather than storing "".
      if (!field.required) continue;
    }

    if (field.type === "email" && input && !EMAIL_RE.test(input)) {
      errors.push({ key: field.key, message: messages.email });
    }

    const { minLength, maxLength } = field.validation;
    if (minLength && input.length < minLength) {
      errors.push({ key: field.key, message: messages.required });
    }
    if (maxLength && input.length > maxLength) {
      errors.push({
        key: field.key,
        message: `${field.label} — max ${maxLength}`,
      });
    }
    if (
      field.type === "select" &&
      input &&
      field.choices.length > 0 &&
      !field.choices.some((choice) => choice.value === input)
    ) {
      errors.push({ key: field.key, message: messages.required });
    }

    snapshot.push({
      key: field.key,
      label: field.label,
      type: field.type,
      value: input,
    });

    if (field.mapsToColumn) columns[field.mapsToColumn] = input;
    else if (input) data[field.key] = input;
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      columns: {
        name: columns.name ?? "",
        email: columns.email ?? "",
        phone: columns.phone || undefined,
        message: columns.message || undefined,
      },
      data,
      snapshot,
    },
  };
}

/**
 * Shapes and initial values for `useActionState` forms.
 *
 * These live outside the "use server" modules on purpose: a server-action file
 * may only export async functions, so constants have to be declared elsewhere.
 */

export type QuoteFormState = {
  status: "idle" | "error";
  errors: Record<string, string>;
  message: string | null;
};

export const initialQuoteState: QuoteFormState = {
  status: "idle",
  errors: {},
  message: null,
};

export type SaveState = {
  status: "idle" | "error" | "saved";
  message: string | null;
};

export const initialSaveState: SaveState = { status: "idle", message: null };

export type CategoryState = { error: string | null; ok: boolean };

export const initialCategoryState: CategoryState = { error: null, ok: false };

export type SettingsState = { ok: boolean; error: string | null };

export const initialSettingsState: SettingsState = { ok: false, error: null };

export type LoginState = { error: string | null };

export const initialLoginState: LoginState = { error: null };

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { toLocale } from "@/i18n/config";
import { ADMIN_LOCALE_COOKIE } from "@/lib/admin-locale";
import {
  authenticate,
  createSessionCookie,
  destroySessionCookie,
} from "@/lib/auth";
import type { LoginState } from "@/lib/action-state";

export async function signInAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "invalid" };
  }

  const user = await authenticate(email, password);
  if (!user) {
    return { error: "invalid" };
  }

  await createSessionCookie(user);
  // Only ever redirect inside the admin area — `next` comes from the URL.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOutAction() {
  await destroySessionCookie();
  redirect("/admin/login");
}

export async function setAdminLocaleAction(formData: FormData) {
  const locale = toLocale(String(formData.get("locale") ?? ""));
  const store = await cookies();
  store.set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

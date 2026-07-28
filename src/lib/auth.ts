import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "./db";
import {
  SESSION_COOKIE,
  signSession,
  sessionCookieOptions,
  verifySession,
  type SessionPayload,
} from "./session";

export type { SessionPayload };

/** Valid bcrypt hash of a value nobody knows, used for timing equalisation. */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Zu";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns null on any failure — never distinguishes "no such user" from
 * "wrong password" to the caller, so the UI can't leak account existence.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const user = await db.adminUser.findUnique({
    where: { email: normaliseEmail(email) },
  });

  // Always run a hash comparison so response timing doesn't reveal whether the
  // account exists. A malformed stored hash must fail closed, not throw.
  const hash = user?.passwordHash ?? DUMMY_HASH;
  let ok = false;
  try {
    ok = await bcrypt.compare(password, hash);
  } catch {
    ok = false;
  }

  if (!user || !user.isActive || !ok) return null;

  await db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Use at the top of every admin page and server action. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Settings, users and destructive actions are admin-only. */
export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin?error=forbidden");
  return user;
}

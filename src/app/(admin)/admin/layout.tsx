import type { Metadata } from "next";

import "../../globals.css";
import { AdminNav } from "@/components/admin/AdminNav";
import { getTranslator } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { getAdminLocale } from "@/lib/admin-locale";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, locale] = await Promise.all([
    getCurrentUser(),
    getAdminLocale(),
  ]);
  const t = getTranslator(locale);

  // The login page shares this root layout but must not render the shell.
  if (!user) {
    return (
      <html lang={locale}>
        <body className="admin-body">{children}</body>
      </html>
    );
  }

  return (
    <html lang={locale}>
      <body className="admin-body">
        <div className="flex min-h-screen">
          <AdminNav
            locale={locale}
            role={user.role}
            userName={user.name}
            labels={{
              dashboard: t("admin.dashboard"),
              projects: t("admin.projects"),
              categories: t("admin.categories"),
              media: t("admin.media"),
              quotes: t("admin.quotes"),
              fields: t("admin.fields"),
              settings: t("admin.settings"),
              users: t("admin.users"),
              viewSite: t("admin.viewSite"),
              signOut: t("admin.signOut"),
            }}
          />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

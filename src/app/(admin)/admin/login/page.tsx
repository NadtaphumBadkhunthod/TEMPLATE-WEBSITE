import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { getTranslator } from "@/i18n";
import { getAdminLocale } from "@/lib/admin-locale";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : "/admin";

  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-xl font-semibold text-ink-900">
          {t("admin.loginTitle")}
        </h1>

        <div className="mt-6 rounded-[--radius-card] border border-ink-200 bg-white p-6">
          <LoginForm
            next={next}
            labels={{
              email: t("admin.email"),
              password: t("admin.password"),
              submit: t("admin.signIn"),
              error: t("admin.loginError"),
            }}
          />
        </div>
      </div>
    </div>
  );
}

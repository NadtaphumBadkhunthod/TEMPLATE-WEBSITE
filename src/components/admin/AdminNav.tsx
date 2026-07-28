"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction, setAdminLocaleAction } from "@/app/actions/admin/session";
import { localeLabels, locales, type Locale } from "@/i18n/config";

type Labels = {
  dashboard: string;
  projects: string;
  categories: string;
  media: string;
  quotes: string;
  fields: string;
  settings: string;
  users: string;
  viewSite: string;
  signOut: string;
};

export function AdminNav({
  locale,
  role,
  userName,
  labels,
}: {
  locale: Locale;
  role: "admin" | "editor";
  userName: string;
  labels: Labels;
}) {
  const pathname = usePathname();

  const groups: { items: { href: string; label: string }[] }[] = [
    {
      items: [
        { href: "/admin", label: labels.dashboard },
        { href: "/admin/projects", label: labels.projects },
        { href: "/admin/categories", label: labels.categories },
        { href: "/admin/media", label: labels.media },
        { href: "/admin/quotes", label: labels.quotes },
      ],
    },
    {
      items: [
        { href: "/admin/fields", label: labels.fields },
        ...(role === "admin"
          ? [
              { href: "/admin/settings", label: labels.settings },
              { href: "/admin/users", label: labels.users },
            ]
          : []),
      ],
    },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ink-200 bg-white">
      <div className="border-b border-ink-200 px-5 py-4">
        <p className="text-sm font-semibold text-ink-900">Admin</p>
        <p className="mt-0.5 truncate text-xs text-ink-500">{userName}</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => (
          <ul key={index} className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    isActive(item.href)
                      ? "bg-brand-50 font-medium text-brand-800"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </nav>

      <div className="space-y-3 border-t border-ink-200 px-3 py-4">
        <form action={setAdminLocaleAction} className="flex gap-1 px-1">
          {locales.map((code) => (
            <button
              key={code}
              type="submit"
              name="locale"
              value={code}
              className={`flex-1 rounded-md px-2 py-1 text-xs transition ${
                code === locale
                  ? "bg-ink-100 font-medium text-ink-900"
                  : "text-ink-500 hover:bg-ink-100"
              }`}
            >
              {localeLabels[code]}
            </button>
          ))}
        </form>

        <Link
          href="/"
          target="_blank"
          className="block rounded-lg px-3 py-2 text-sm text-ink-600 transition hover:bg-ink-100"
        >
          {labels.viewSite} ↗
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-600 transition hover:bg-red-50 hover:text-red-700"
          >
            {labels.signOut}
          </button>
        </form>
      </div>
    </aside>
  );
}

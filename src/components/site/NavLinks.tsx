"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/**
 * Client-side only so the active item can be underlined — the header itself is
 * a server component and has no access to the current path.
 */
export function NavLinks({
  links,
  variant,
}: {
  links: NavLink[];
  variant: "desktop" | "mobile";
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // The locale root ("/th") would otherwise match every page beneath it.
    const segments = href.split("/").filter(Boolean);
    if (segments.length <= 1) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (variant === "mobile") {
    return (
      <>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`whitespace-nowrap rounded-[--radius-pill] px-4 py-2 text-sm font-medium transition ${
              isActive(link.href)
                ? "grad-action text-white"
                : "bg-ink-50 text-ink-600"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={`rounded-[--radius-pill] px-4 py-2 text-[0.95rem] font-medium transition ${
            isActive(link.href)
              ? "bg-brand-50 text-brand-700"
              : "text-ink-600 hover:bg-ink-50 hover:text-brand-700"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

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
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
              isActive(link.href)
                ? "border-accent-400 text-brand-800"
                : "border-transparent text-ink-600"
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
          className={`relative px-4 py-5 text-[0.95rem] font-medium transition after:absolute after:inset-x-3 after:bottom-3 after:h-[3px] after:transition-colors ${
            isActive(link.href)
              ? "text-brand-800 after:bg-accent-400"
              : "text-ink-600 after:bg-transparent hover:text-brand-800 hover:after:bg-accent-200"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

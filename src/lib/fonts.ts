import { Kanit, Sarabun } from "next/font/google";

/*
 * Both faces carry full Thai and Latin coverage, so a Thai page and an English
 * page share one vertical rhythm instead of falling back to different system
 * fonts per locale. Loaded here rather than per-layout because the site and the
 * admin panel are separate root layouts and must reference the same instances —
 * next/font dedupes per module, so two imports would otherwise mean two
 * downloads and two sets of CSS variables.
 *
 * The `--font-*-var` names are consumed by --font-sans / --font-display in
 * globals.css.
 */

export const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sarabun-var",
});

export const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit-var",
});

/** Put this on <html> so the variables are in scope for the whole document. */
export const fontVariables = `${sarabun.variable} ${kanit.variable}`;

import { Kanit } from "next/font/google";

/*
 * NST Fair sets everything in Kanit — headings and body alike — so this site
 * loads one family rather than pairing a display face with a text face. Kanit
 * carries full Thai and Latin coverage, so a Thai page and an English page share
 * one vertical rhythm instead of falling back to different system fonts.
 *
 * Loaded here rather than per-layout because the public site and the admin panel
 * are separate root layouts and must reference the same instance — next/font
 * dedupes per module, so two imports would mean two downloads and two sets of
 * CSS variables.
 *
 * `--font-kanit-var` is consumed by --font-sans and --font-display in globals.css.
 */

export const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit-var",
});

/** Put this on <html> so the variable is in scope for the whole document. */
export const fontVariables = kanit.variable;

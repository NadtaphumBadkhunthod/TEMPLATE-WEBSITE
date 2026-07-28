/**
 * Slug generation keeps Latin letters, digits and Thai script, so auto-slugging
 * a Thai title still produces something usable instead of an empty string.
 *
 * For shareable URLs a romanised ASCII slug is usually nicer — the admin can
 * always type one by hand, and the generated value is only ever a suggestion.
 */
const THAI_RANGE = "\\u0E00-\\u0E7F";
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
const NON_SLUG = new RegExp(`[^a-z0-9${THAI_RANGE}]+`, "g");

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_SLUG, "-")
    .replace(/^-+|-+$/g, "");
}

/** Appends -2, -3 … until the candidate is not in `taken`. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const seed = base || "item";
  if (!used.has(seed)) return seed;
  let n = 2;
  while (used.has(`${seed}-${n}`)) n += 1;
  return `${seed}-${n}`;
}

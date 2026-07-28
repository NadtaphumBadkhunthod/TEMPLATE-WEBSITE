/**
 * Rich text is stored as a small array of typed blocks rather than HTML.
 *
 * Why: nothing user-supplied is ever rendered as markup, so the description
 * field can't become an XSS vector, and the content stays portable if the site
 * is rebuilt on another stack. The admin edits these through a block editor.
 */

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

export type BlockType = Block["type"];

export const blockTypes: BlockType[] = [
  "paragraph",
  "heading",
  "list",
  "quote",
];

export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case "list":
      return { type: "list", items: [""] };
    case "heading":
      return { type: "heading", text: "" };
    case "quote":
      return { type: "quote", text: "" };
    default:
      return { type: "paragraph", text: "" };
  }
}

/** Tolerant parser — bad or legacy data degrades to an empty document. */
export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  const blocks: Block[] = [];

  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Record<string, unknown>;

    if (entry.type === "list") {
      const items = Array.isArray(entry.items)
        ? entry.items.filter((i): i is string => typeof i === "string")
        : [];
      if (items.length) blocks.push({ type: "list", items });
      continue;
    }

    if (
      (entry.type === "paragraph" ||
        entry.type === "heading" ||
        entry.type === "quote") &&
      typeof entry.text === "string"
    ) {
      if (entry.text.trim()) {
        blocks.push({ type: entry.type, text: entry.text });
      }
    }
  }

  return blocks;
}

export function blocksToPlainText(blocks: Block[], limit = 200): string {
  const text = blocks
    .map((block) =>
      block.type === "list" ? block.items.join(" ") : block.text,
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** Feature bullets — the "list format" alternative to a prose description. */
export type Feature = { text: string };

export function parseFeatures(value: unknown): Feature[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (typeof raw === "string") return { text: raw };
      if (typeof raw === "object" && raw !== null) {
        const text = (raw as Record<string, unknown>).text;
        if (typeof text === "string") return { text };
      }
      return null;
    })
    .filter((f): f is Feature => !!f && f.text.trim().length > 0);
}

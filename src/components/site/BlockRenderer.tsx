import type { Block } from "@/lib/blocks";

/**
 * Renders stored blocks as real elements. Nothing here uses
 * dangerouslySetInnerHTML, so admin-entered text can never inject markup.
 */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return null;

  return (
    <div className="prose-block text-ink-700">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return <h3 key={index}>{block.text}</h3>;
          case "quote":
            return <blockquote key={index}>{block.text}</blockquote>;
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          default:
            return <p key={index}>{block.text}</p>;
        }
      })}
    </div>
  );
}

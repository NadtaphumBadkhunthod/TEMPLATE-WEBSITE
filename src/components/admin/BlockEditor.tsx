"use client";

import { blockTypes, emptyBlock, type Block, type BlockType } from "@/lib/blocks";

/**
 * A deliberately small structured editor. It produces the same Block[] the
 * public site renders, so there is no HTML round-trip and no sanitising step.
 */
export function BlockEditor({
  value,
  onChange,
}: {
  value: Block[];
  onChange: (next: Block[]) => void;
}) {
  function update(index: number, next: Block) {
    onChange(value.map((block, i) => (i === index ? next : block)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {value.map((block, index) => (
        <div
          key={index}
          className="rounded-lg border border-ink-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <select
              value={block.type}
              onChange={(event) =>
                update(index, emptyBlock(event.target.value as BlockType))
              }
              className="rounded border border-ink-300 px-2 py-1 text-xs"
            >
              {blockTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="rounded px-2 py-1 text-xs text-ink-500 hover:bg-ink-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                aria-label="Move down"
                className="rounded px-2 py-1 text-xs text-ink-500 hover:bg-ink-100 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Remove block"
                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </div>

          {block.type === "list" ? (
            <ListBlockFields
              items={block.items}
              onChange={(items) => update(index, { type: "list", items })}
            />
          ) : (
            <textarea
              value={block.text}
              onChange={(event) =>
                update(index, { ...block, text: event.target.value })
              }
              rows={block.type === "heading" ? 1 : 4}
              placeholder={block.type}
              className="w-full rounded border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {blockTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange([...value, emptyBlock(type)])}
            className="rounded-lg border border-dashed border-ink-300 px-3 py-1.5 text-xs text-ink-600 hover:border-brand-400 hover:text-brand-700"
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListBlockFields({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item}
            onChange={(event) =>
              onChange(
                items.map((value, i) =>
                  i === index ? event.target.value : value,
                ),
              )
            }
            className="flex-1 rounded border border-ink-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            aria-label="Remove item"
            className="rounded px-2 text-xs text-red-600 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-xs text-brand-700 hover:text-brand-800"
      >
        + item
      </button>
    </div>
  );
}

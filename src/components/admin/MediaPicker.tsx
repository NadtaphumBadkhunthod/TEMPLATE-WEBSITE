"use client";

import { useRef, useState } from "react";

import { extensionLabel } from "@/lib/file-types";

export type MediaOption = {
  id: string;
  url: string;
  kind: string;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

export function MediaPicker({
  assets,
  selected,
  onChange,
  onUploaded,
  multiple = true,
  kinds,
  emptyLabel = "No files yet.",
}: {
  assets: MediaOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  onUploaded: (asset: MediaOption) => void;
  multiple?: boolean;
  kinds?: string[];
  emptyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = kinds
    ? assets.filter((asset) => kinds.includes(asset.kind))
    : assets;

  function toggle(id: string) {
    if (!multiple) {
      onChange(selected.includes(id) ? [] : [id]);
      return;
    }
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body,
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error ?? "Upload failed");
          continue;
        }
        onUploaded(json as MediaOption);
        onChange(multiple ? [...selected, json.id] : [json.id]);
      } catch {
        setError("Upload failed");
      }
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:border-brand-400 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          hidden
          onChange={(event) => upload(event.target.files)}
        />
        {selected.length > 0 && (
          <span className="text-xs text-ink-500">{selected.length} selected</span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {visible.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-ink-200 bg-ink-50 p-2 sm:grid-cols-4">
          {visible.map((asset) => {
            const isSelected = selected.includes(asset.id);
            const order = selected.indexOf(asset.id) + 1;
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => toggle(asset.id)}
                  aria-pressed={isSelected}
                  className={`relative block w-full overflow-hidden rounded-lg border-2 bg-white transition ${
                    isSelected
                      ? "border-brand-500"
                      : "border-transparent hover:border-ink-300"
                  }`}
                >
                  {asset.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <span
                        aria-hidden
                        className="grid h-7 w-11 place-items-center bg-brand-700 text-[9px] font-bold text-white"
                      >
                        {extensionLabel(
                          asset.originalName,
                          asset.mimeType,
                        ).slice(0, 5)}
                      </span>
                      <span className="line-clamp-2 break-all text-[10px] text-ink-500">
                        {asset.originalName}
                      </span>
                    </span>
                  )}

                  {isSelected && multiple && (
                    <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      {order}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

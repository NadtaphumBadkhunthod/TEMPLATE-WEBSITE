"use client";

import { useState } from "react";

type Image = { id: string; url: string; alt: string };

export function Gallery({ images }: { images: Image[] }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="overflow-hidden rounded-[--radius-card] border border-ink-200 bg-ink-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt}
          className="aspect-[16/10] w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={image.alt}
                aria-current={index === active}
                className={`block w-full overflow-hidden rounded-lg border-2 transition ${
                  index === active
                    ? "border-brand-500"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";

import type { ProjectListItem } from "@/lib/content";
import type { Locale } from "@/i18n/config";

export function ProjectCard({
  project,
  locale,
}: {
  project: ProjectListItem;
  locale: Locale;
}) {
  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      {/* Gradient rule that wipes in on hover — the reference site's card accent. */}
      <span
        aria-hidden
        className="grad-action absolute inset-x-0 top-0 z-10 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
      />
      <div className="aspect-[4/3] overflow-hidden bg-brand-50">
        {project.coverUrl ? (
          // Plain <img>: media is streamed from our own route and already sized
          // sensibly, so the optimiser would add a dependency for little gain.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverUrl}
            alt={project.coverAlt}
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-brand-400">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {project.categories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {project.categories.slice(0, 2).map((category) => (
              <span
                key={category.id}
                className="rounded-[--radius-pill] bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
              >
                {category.name}
              </span>
            ))}
          </div>
        )}

        <h3 className="text-lg font-semibold leading-snug transition group-hover:text-brand-700">
          <Link
            href={`/${locale}/projects/${project.slug}`}
            className="after:absolute after:inset-0"
          >
            {project.title}
          </Link>
        </h3>

        {project.summary && (
          <p className="mt-2 line-clamp-3 text-sm text-ink-500">
            {project.summary}
          </p>
        )}
      </div>
    </article>
  );
}

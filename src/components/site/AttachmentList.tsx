import type { AttachmentGroup } from "@/lib/content";
import { formatFileSize } from "@/lib/format";
import { extensionLabel, kindForMime } from "@/lib/file-types";
import type { Translator } from "@/i18n";

/**
 * Every file in a project's folder is downloadable, whatever the format, and the
 * sub-folder it sits in becomes the heading it appears under. A project that keeps
 * everything at the top level gets one plain list with no headings at all.
 *
 * Audio and video additionally get a native player, since for those a
 * download-only link is a worse experience than pressing play — the download stays
 * available either way.
 */
export function AttachmentList({
  groups,
  t,
}: {
  groups: AttachmentGroup[];
  t: Translator;
}) {
  // A single unnamed group means nothing has been sorted into folders, so a
  // heading over it would just repeat the section title above.
  const showHeadings = groups.length > 1 || groups[0]?.key !== "";

  return (
    <div className="mt-5 space-y-8">
      {groups.map((group) => (
        <section key={group.key || "_root"}>
          {showHeadings && (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {group.label}
            </h3>
          )}

          <ul className="space-y-3">
            {group.files.map((file) => {
              const kind = kindForMime(file.mimeType ?? "");
              const badge = extensionLabel(file.fileName, file.mimeType);

              return (
                <li key={file.id} className="card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      aria-hidden
                      className="grad-action grid h-11 w-14 shrink-0 place-items-center rounded-xl font-display text-[0.7rem] font-semibold tracking-wide text-white"
                    >
                      {badge.slice(0, 5)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-brand-800">
                        {file.label}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {[
                          badge,
                          file.sizeBytes ? formatFileSize(file.sizeBytes) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <a
                      href={file.downloadUrl}
                      target={file.isExternal ? "_blank" : undefined}
                      rel={file.isExternal ? "noopener noreferrer" : undefined}
                      download={file.isExternal ? undefined : ""}
                      className="btn btn-outline shrink-0 px-4 py-2 text-sm"
                    >
                      {file.isExternal ? (
                        <>
                          {t("project.openLink")} <span aria-hidden>↗</span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden>↓</span> {t("project.download")}
                        </>
                      )}
                    </a>
                  </div>

                  {!file.isExternal && kind === "audio" && (
                    <audio
                      controls
                      preload="metadata"
                      src={file.url}
                      className="mt-4 w-full"
                    />
                  )}

                  {!file.isExternal && kind === "video" && (
                    <video
                      controls
                      preload="metadata"
                      src={file.url}
                      className="mt-4 max-h-96 w-full rounded-xl bg-black"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

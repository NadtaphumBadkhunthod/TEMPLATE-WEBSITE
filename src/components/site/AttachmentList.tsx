import type { AttachmentView } from "@/lib/content";
import { formatFileSize } from "@/lib/format";
import { extensionLabel, kindForMime } from "@/lib/file-types";
import type { Translator } from "@/i18n";

/**
 * Any file the admin attaches is downloadable, whatever the format. Audio and
 * video additionally get a native player, since for those a download-only link
 * is a worse experience than pressing play — the download stays available.
 */
export function AttachmentList({
  attachments,
  t,
}: {
  attachments: AttachmentView[];
  t: Translator;
}) {
  return (
    <ul className="mt-5 divide-y divide-ink-200 border border-ink-200">
      {attachments.map((file) => {
        const kind = kindForMime(file.mimeType ?? "");
        const badge = extensionLabel(file.fileName, file.mimeType);
        // External links have no stored bytes to force a download on.
        const downloadHref = file.isExternal ? file.url : `${file.url}?download=1`;

        return (
          <li key={file.id} className="bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span
                aria-hidden
                className="grid h-11 w-14 shrink-0 place-items-center bg-brand-700 font-display text-[0.7rem] font-bold tracking-wide text-white"
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
                href={downloadHref}
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
                className="mt-4 max-h-96 w-full bg-black"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

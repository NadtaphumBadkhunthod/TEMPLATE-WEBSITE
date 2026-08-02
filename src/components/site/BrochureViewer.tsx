import type { BrochureView } from "@/lib/content";
import { formatFileSize } from "@/lib/format";
import { extensionLabel } from "@/lib/file-types";
import type { Translator } from "@/i18n";

/**
 * Renders a project's brochure in place of (or above) its typed description.
 *
 * Two shapes are supported because both are what people actually have: a single
 * PDF, which is embedded in the browser's own viewer, and a set of image pages,
 * which are stacked. Either way every page also gets an explicit download, since
 * an embedded PDF is unreliable on mobile browsers and unusable to a screen
 * reader — the download is the accessible path, not a nicety.
 */
export function BrochureViewer({
  brochure,
  t,
}: {
  brochure: BrochureView;
  t: Translator;
}) {
  const multiPage = brochure.pages.length > 1;

  return (
    <div>
      {!brochure.isTranslated && (
        <p className="mb-4 border-l-[3px] border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("project.brochureNotTranslated")}
        </p>
      )}

      <div className="space-y-6">
        {brochure.pages.map((page, index) => (
          <figure key={page.id}>
            {page.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.url}
                alt={
                  multiPage
                    ? `${page.label} — ${t("project.brochurePage", { n: index + 1 })}`
                    : page.label
                }
                loading={index === 0 ? "eager" : "lazy"}
                className="w-full rounded-[--radius-card] border border-ink-200 bg-white"
              />
            ) : (
              /*
               * <object> rather than <iframe>: it degrades to its own children
               * when the browser cannot display a PDF, which is exactly the
               * fallback we want and which an iframe does not give us.
               */
              <object
                data={page.url}
                type={page.mimeType ?? "application/pdf"}
                aria-label={page.label}
                className="h-[80vh] min-h-[420px] w-full rounded-[--radius-card] border border-ink-200 bg-ink-50"
              >
                <div className="p-8 text-center">
                  <p className="text-sm text-ink-600">
                    {t("project.brochureUnsupported")}
                  </p>
                  <a
                    href={page.downloadUrl}
                    download=""
                    className="btn btn-primary mt-4 px-5 py-2.5 text-sm"
                  >
                    {t("project.brochureDownload")}
                  </a>
                </div>
              </object>
            )}

            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink-500">
                {multiPage
                  ? `${t("project.brochurePage", { n: index + 1 })} · `
                  : ""}
                {[
                  extensionLabel(page.fileName, page.mimeType),
                  page.sizeBytes ? formatFileSize(page.sizeBytes) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>

              <span className="flex flex-wrap gap-2">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline px-4 py-2 text-sm"
                >
                  {t("project.brochureOpen")} <span aria-hidden>↗</span>
                </a>
                <a
                  href={page.downloadUrl}
                  download=""
                  className="btn btn-primary px-4 py-2 text-sm"
                >
                  <span aria-hidden>↓</span> {t("project.brochureDownload")}
                </a>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

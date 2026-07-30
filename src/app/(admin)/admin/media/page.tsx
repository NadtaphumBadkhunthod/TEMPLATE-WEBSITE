import { deleteMedia } from "@/app/actions/admin/media";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { getTranslator } from "@/i18n";
import { getAdminLocale } from "@/lib/admin-locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatFileSize } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireUser();
  const locale = await getAdminLocale();
  const t = getTranslator(locale);

  const assets = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projectMedia: true, coverOfProjects: true } },
    },
    take: 300,
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-ink-900">{t("admin.media")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        Files used across projects. Anything still in use cannot be deleted.
      </p>

      <div className="mt-6">
        <MediaUploader />
      </div>

      {assets.length === 0 ? (
        <p className="mt-10 rounded-[--radius-card] border border-dashed border-ink-300 px-6 py-16 text-center text-sm text-ink-500">
          {t("admin.noData")}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((asset) => {
            const url = mediaUrl(asset);
            const inUse =
              asset._count.projectMedia > 0 || asset._count.coverOfProjects > 0;

            return (
              <li
                key={asset.id}
                className="overflow-hidden rounded-[--radius-card] border border-ink-200 bg-white"
              >
                <div className="aspect-square bg-ink-100">
                  {asset.kind === "image" && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={asset.originalName ?? ""}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-3xl text-ink-500">
                      ⎙
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p
                    title={asset.originalName ?? ""}
                    className="truncate text-xs font-medium text-ink-800"
                  >
                    {asset.originalName ?? asset.id}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {formatFileSize(asset.sizeBytes)} ·{" "}
                    {formatDate(asset.createdAt, locale)}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    {inUse ? (
                      <span className="text-[11px] text-ink-500">
                        in use ({asset._count.projectMedia +
                          asset._count.coverOfProjects})
                      </span>
                    ) : (
                      <form action={deleteMedia}>
                        <input type="hidden" name="id" value={asset.id} />
                        <button
                          type="submit"
                          className="text-[11px] text-red-600 hover:text-red-700"
                        >
                          {t("common.delete")}
                        </button>
                      </form>
                    )}
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand-700 hover:underline"
                      >
                        open
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

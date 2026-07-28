import type { Locale } from "@/i18n/config";

const localeTags: Record<string, string> = {
  th: "th-TH",
  en: "en-US",
};

export function formatDate(
  value: Date | string | null | undefined,
  locale: Locale,
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeTags[locale] ?? "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale: Locale = "en",
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeTags[locale] ?? "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

import type { Locale } from "@/i18n/config";

const localeTags: Record<string, string> = {
  th: "th-TH",
  en: "en-US",
};

export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: Locale,
): string {
  if (amount === null || amount === undefined) return "";
  const code = currency || "THB";
  try {
    return new Intl.NumberFormat(localeTags[locale] ?? "en-US", {
      style: "currency",
      currency: code,
      // Without this, en-US renders THB as "THB 2,450,000" rather than "฿…".
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${code}`;
  }
}

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

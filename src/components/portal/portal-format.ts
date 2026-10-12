/** Small display helpers shared by the portal pages. No PHI is logged or stored here. */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses an ISO datetime or a bare YYYY-MM-DD (as a local calendar date, avoiding UTC drift). */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = YMD.exec(value);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  value: string | null | undefined,
  fallback = "",
): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(
  value: string | null | undefined,
  fallback = "",
): string {
  const d = parseDate(value);
  if (!d) return fallback;
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();
  return `${date} at ${time}`;
}

export function formatTime(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Local calendar date as YYYY-MM-DD. */
export function toYmd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** "7.50" -> "7.5 mg". Returns "" for missing or non-numeric values. */
export function formatMg(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${Number.parseFloat(n.toFixed(2))} mg`;
}

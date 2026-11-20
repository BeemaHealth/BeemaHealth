// Time helpers. Timestamps are stored in UTC; days and display use America/Denver.
import { TIME_ZONE } from "./pages.ts";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of a UTC instant, as seen in Denver. */
export const denverDate = (iso: string | Date): string =>
  dateFmt.format(typeof iso === "string" ? new Date(iso) : iso);

const hourFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** UTC ms of local midnight (start) of a Denver calendar day. DST safe. */
export function denverDayStartMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  // Midnight Denver is 06:00 or 07:00 UTC; pick whichever renders as 00:00.
  for (const h of [6, 7]) {
    const t = Date.UTC(y, m - 1, d, h);
    if (
      hourFmt.format(new Date(t)) === "24:00" ||
      hourFmt.format(new Date(t)) === "00:00"
    ) {
      if (denverDate(new Date(t)) === date) return t;
    }
  }
  return Date.UTC(y, m - 1, d, 7);
}

export const addDays = (date: string, n: number): string => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const denverDayEndMs = (date: string): number =>
  denverDayStartMs(addDays(date, 1));

const shortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
});
const longFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const fmtDay = (iso: string) => shortFmt.format(new Date(iso));
export const fmtDateTime = (iso: string) =>
  longFmt.format(new Date(iso)) + " MT";
export const fmtDateKey = (key: string) =>
  shortFmt.format(new Date(denverDayStartMs(key) + 3600_000));

/** "YYYY-MM-DDTHH:mm" read as Denver wall-clock time -> UTC ISO string, or null if invalid. */
export function denverLocalToIso(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Denver is UTC-6 (MDT) or UTC-7 (MST): pick the offset that renders back to the input.
  for (const off of [6, 7]) {
    const t = wall + off * 3600_000;
    if (denverLocalValue(new Date(t)) === local)
      return new Date(t).toISOString();
  }
  return null; // nonexistent wall time (spring-forward gap)
}

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** UTC instant -> "YYYY-MM-DDTHH:mm" in Denver, for datetime-local inputs. */
export function denverLocalValue(d: Date): string {
  const p = Object.fromEntries(
    partsFmt.formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

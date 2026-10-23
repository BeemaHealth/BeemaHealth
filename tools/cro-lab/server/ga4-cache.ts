// Per-day on-disk cache of GA4 results. A normal load only asks Google for
// days it has never pulled; Refresh also re-pulls recent days, which GA4 keeps
// revising for about two days. Aggregate counts only, no PHI.
import fs from "node:fs";
import path from "node:path";
import type { DailyRow, DownstreamRow, PathRow } from "../shared/types.ts";
import { denverDayEndMs, eachDate } from "../shared/time.ts";

const VERSION = 2;
/** GA4 can still change a day's numbers for about 48 hours after it ends. */
export const FINAL_AFTER_MS = 48 * 3600_000;

export type DayStore = {
  version: number;
  /** Pages and tracking start the data was pulled for; a change drops the cache. */
  key: string;
  /** date -> ISO time that day was last pulled from GA4. */
  days: Record<string, string>;
  rows: DailyRow[];
  paths: PathRow[];
  downstream: DownstreamRow[];
};

export type Fetched = {
  rows: DailyRow[];
  paths: PathRow[];
  downstream: DownstreamRow[];
};

export const storeKey = (pageIds: readonly string[], trackingStart: string) =>
  `${[...pageIds].sort().join(",")}|${trackingStart}`;

export const emptyStore = (key: string): DayStore => ({
  version: VERSION,
  key,
  days: {},
  rows: [],
  paths: [],
  downstream: [],
});

/** True once a day was pulled late enough that GA4 will not revise it again. */
export const isFinal = (date: string, fetchedAt: string): boolean =>
  Date.parse(fetchedAt) >= denverDayEndMs(date) + FINAL_AFTER_MS;

/**
 * Days that need a GA4 call: never pulled, or (when `force`) pulled while GA4
 * could still revise them. Everything else is served from the cache.
 */
export function datesToFetch(
  store: DayStore,
  from: string,
  to: string,
  force: boolean,
): string[] {
  return eachDate(from, to).filter((d) => {
    const at = store.days[d];
    return !at || (force && !isFinal(d, at));
  });
}

/** Folds freshly pulled data for `dates` into the store, replacing those days. */
export function applyFetch(
  store: DayStore,
  dates: readonly string[],
  fetched: Fetched,
  nowIso: string,
): DayStore {
  const set = new Set(dates);
  const merge = <T extends { date: string }>(old: T[], add: T[]): T[] =>
    [
      ...old.filter((r) => !set.has(r.date)),
      ...add.filter((r) => set.has(r.date)),
    ].sort((a, b) => a.date.localeCompare(b.date));
  const days = { ...store.days };
  for (const d of dates) days[d] = nowIso;
  return {
    ...store,
    days,
    rows: merge(store.rows, fetched.rows),
    paths: merge(store.paths, fetched.paths),
    downstream: merge(store.downstream, fetched.downstream),
  };
}

/** When the newest day in the store was pulled, or null for an empty store. */
export function lastPulled(store: DayStore): string | null {
  const all = Object.values(store.days);
  return all.length ? all.reduce((a, b) => (a > b ? a : b)) : null;
}

export function saveStore(file: string, store: DayStore): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, file);
  } catch {
    /* best effort: without it the next start just pulls again */
  }
}

/** The saved store, or null if missing, unreadable, or for different pages. */
export function loadStore(file: string, key: string): DayStore | null {
  try {
    const s = JSON.parse(fs.readFileSync(file, "utf8")) as DayStore;
    if (
      s.version !== VERSION ||
      s.key !== key ||
      typeof s.days !== "object" ||
      !Array.isArray(s.rows) ||
      !Array.isArray(s.paths) ||
      !Array.isArray(s.downstream)
    )
      return null;
    return s;
  } catch {
    return null;
  }
}

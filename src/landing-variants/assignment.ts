/**
 * Pure variant-assignment helpers. The only thing stored in the browser is the
 * assigned variant id under `beema_exp:<experimentId>` - no visitor id, no PHI.
 */

export type WeightedId = { id: string; weight: number };

const KEY_PREFIX = "beema_exp:";
export const EXCLUDE_KEY = "beema_exp_exclude";

/** Picks an id by weight. `r` is a uniform random number in [0, 1). */
export function pickWeighted(
  entries: readonly WeightedId[],
  r: number,
): string {
  const live = entries.filter((e) => e.weight > 0);
  if (live.length === 0) throw new Error("No variants with traffic");
  const total = live.reduce((sum, e) => sum + e.weight, 0);
  let acc = 0;
  const target = Math.min(Math.max(r, 0), 0.999999999) * total;
  for (const e of live) {
    acc += e.weight;
    if (target < acc) return e.id;
  }
  return live[live.length - 1].id;
}

type Store = Pick<Storage, "getItem" | "setItem">;

function safeGet(store: Store | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(store: Store | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage blocked (private mode): visitor is simply reassigned next load.
  }
}

/**
 * Returns the visitor's variant for this experiment. A stored assignment is
 * kept while that variant still has traffic; otherwise the visitor is
 * reassigned and the new id is stored.
 */
export function assignVariant(opts: {
  experimentId: string;
  entries: readonly WeightedId[];
  store?: Store;
  random?: () => number;
}): { variantId: string; fromStorage: boolean } {
  const { experimentId, entries, store, random = Math.random } = opts;
  const key = KEY_PREFIX + experimentId;
  const stored = safeGet(store, key);
  if (stored && entries.some((e) => e.id === stored && e.weight > 0)) {
    return { variantId: stored, fromStorage: true };
  }
  const variantId = pickWeighted(entries, random());
  safeSet(store, key, variantId);
  return { variantId, fromStorage: false };
}

export function readPreviewParam(search: string): string | null {
  const v = new URLSearchParams(search).get("preview_variant");
  return v && /^v[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? v : null;
}

/** `?exp_exclude=1` marks this browser as admin (no experiment events); `=0` clears it. */
export function applyExcludeParam(search: string, store?: Store): boolean {
  const v = new URLSearchParams(search).get("exp_exclude");
  if (v === "1") safeSet(store, EXCLUDE_KEY, "1");
  if (v === "0") safeSet(store, EXCLUDE_KEY, "0");
  return safeGet(store, EXCLUDE_KEY) === "1";
}

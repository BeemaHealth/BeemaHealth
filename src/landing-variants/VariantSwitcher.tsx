// Staging-only floating switcher for landing pages and their variants. Loaded
// lazily behind VITE_PREVIEW_ALL_VARIANTS=1, so production bundles never
// include it. Minimizing collapses it to a pill instead of removing it, so
// there is always a way to bring it back.
import { ChevronDown, FlaskConical } from "lucide-react";
import { useState } from "react";
import { listVariants } from "./dev-variants";
import { EXPERIMENTS } from "./experiments.generated";

/** Greppable by deploy-frontend-prod.sh: this string must never ship to production. */
export const STAGING_ONLY_MARKER = "__beema_staging_only_switcher__";

/** Hosts where the switcher must never render, even if a build included it. */
const PRODUCTION_HOSTS = new Set(["beemahealth.com", "www.beemahealth.com"]);

const STORAGE_KEY = "beema.stagingSwitcher.open";

const readOpen = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
};

const writeOpen = (open: boolean) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    /* preference only */
  }
};

const selectCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground";

export default function VariantSwitcher({
  page,
  currentId,
}: {
  page: string;
  currentId: string;
}) {
  const [open, setOpen] = useState(readOpen);
  if (PRODUCTION_HOSTS.has(window.location.hostname)) return null;
  const variants = listVariants(page);
  const pages = Object.keys(EXPERIMENTS);

  const toggle = (next: boolean) => {
    setOpen(next);
    writeOpen(next);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        aria-label="Open staging variant switcher (staging only)"
        data-staging-only={STAGING_ONLY_MARKER}
        className="fixed bottom-3 left-3 z-[100] inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground shadow-lg"
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        Variants
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Staging variant switcher"
      data-staging-only={STAGING_ONLY_MARKER}
      className="fixed bottom-3 left-3 z-[100] w-64 space-y-2 rounded-xl border border-border bg-background p-3 text-foreground shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest">
          Staging preview
        </p>
        <button
          type="button"
          onClick={() => toggle(false)}
          aria-label="Minimize variant switcher"
          className="inline-flex size-6 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="rounded-md bg-muted px-2 py-1 text-[11px] leading-snug text-muted-foreground">
        Staging only. This panel is never shown on beemahealth.com, even when
        open.
      </p>
      <label className="block text-[11px] text-muted-foreground">
        Page
        <select
          className={selectCls}
          value={page}
          onChange={(e) => {
            window.location.href = `/${e.target.value}/`;
          }}
        >
          {pages.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-muted-foreground">
        Variant
        <select
          className={selectCls}
          value={currentId}
          onChange={(e) => {
            window.location.href = `/${page}/?preview_variant=${encodeURIComponent(e.target.value)}`;
          }}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

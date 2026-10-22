import { useEffect, useLayoutEffect, useState } from "react";
import {
  setExperimentContext,
  setExperimentTrackingSuppressed,
  trackVariantExposure,
} from "@/lib/experiment-context";
import {
  applyExcludeParam,
  assignVariant,
  readPreviewParam,
} from "./assignment";
import { EXPERIMENTS } from "./experiments.generated";
import type { ExperimentConfig, LandingVariant } from "./types";

type PageKey = keyof typeof EXPERIMENTS;

type Resolution = {
  variant: LandingVariant;
  /** Preview and excluded-admin visits are never tracked. */
  tracked: boolean;
};

/**
 * Renders the visitor's variant for an ad landing page.
 *
 * - One live variant: that variant, same for everyone.
 * - Several live variants: weighted random split, sticky per browser. The
 *   prerendered default is hidden (never painted) until the assigned variant
 *   has mounted, so there is no visible flicker.
 * - `?preview_variant=<id>` shows a variant without tracking. In production
 *   only live variants can be previewed; in dev, any variant file.
 */
export function LandingExperiment({ page }: { page: PageKey }) {
  const config: ExperimentConfig = EXPERIMENTS[page];
  const entries = config.variants;
  const isSplit = entries.length > 1;
  const defaultVariant = entries[0].variant;

  const [resolved, setResolved] = useState<Resolution>({
    variant: defaultVariant,
    tracked: false,
  });
  const [ready, setReady] = useState(!isSplit);

  // Layout effect: runs after hydration but before the browser paints the
  // swapped variant.
  useLayoutEffect(() => {
    let cancelled = false;
    const search = window.location.search;
    const store = safeLocalStorage();
    const excluded = applyExcludeParam(search, store);
    const previewId = readPreviewParam(search);

    const finish = (variant: LandingVariant, tracked: boolean) => {
      if (cancelled) return;
      setResolved({ variant, tracked });
      setReady(true);
    };

    if (previewId) {
      const live = entries.find((e) => e.variant.id === previewId)?.variant;
      if (live) {
        finish(live, false);
        return undefined;
      }
      if (import.meta.env.DEV) {
        void import("./dev-variants").then(({ findDevVariant }) =>
          finish(findDevVariant(page, previewId) ?? defaultVariant, false),
        );
        return () => {
          cancelled = true;
        };
      }
      finish(defaultVariant, false);
      return undefined;
    }
    if (excluded) {
      finish(defaultVariant, false);
      return undefined;
    }
    if (!isSplit) {
      finish(defaultVariant, true);
      return undefined;
    }
    const { variantId } = assignVariant({
      experimentId: config.experimentId,
      entries: entries.map((e) => ({ id: e.variant.id, weight: e.weight })),
      store,
    });
    finish(
      entries.find((e) => e.variant.id === variantId)?.variant ??
        defaultVariant,
      true,
    );
    return undefined;
    // Resolve once per mount; config is static for a given build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    if (!resolved.tracked) {
      setExperimentTrackingSuppressed(true);
      return () => setExperimentTrackingSuppressed(false);
    }
    const ctx = {
      experimentId: config.experimentId,
      variantId: resolved.variant.id,
      landingPageId: page,
    };
    setExperimentContext(ctx);
    trackVariantExposure(ctx);
    return () => setExperimentContext(null);
  }, [ready, resolved, config.experimentId, page]);

  const { Component } = resolved.variant;
  return (
    <div className={ready ? "contents" : "contents exp-pending"}>
      <Component />
    </div>
  );
}

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

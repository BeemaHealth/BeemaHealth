/**
 * Landing-page experiment attribution.
 *
 * Every exposure and intake handoff is tagged with three stable, non-personal
 * ids: experiment_id, variant_id, landing_page_id. Nothing here touches health
 * or identity data. The only thing persisted in the browser is the assigned
 * variant id (see landing-variants/assignment.ts).
 */
import { trackGaEvent } from "@/lib/ad-conversions";
import { GTM_PRODUCTION_HOSTNAME } from "@/lib/gtm";

export type ExperimentContext = {
  experimentId: string;
  variantId: string;
  landingPageId: string;
};

let current: ExperimentContext | null = null;
let suppressed = false;

export function setExperimentContext(ctx: ExperimentContext | null): void {
  current = ctx;
}

export function getExperimentContext(): ExperimentContext | null {
  return current;
}

/** True while the visitor is previewing or is an excluded admin browser. */
export function setExperimentTrackingSuppressed(value: boolean): void {
  suppressed = value;
}

/**
 * Events go out only from the production host (or with ?ga_debug=1 so
 * DebugView can verify a build). Keeps localhost/dev traffic out of GA4.
 */
export function shouldSendExperimentEvents(
  location:
    | Pick<Location, "hostname" | "search">
    | undefined = typeof window !== "undefined" ? window.location : undefined,
): boolean {
  if (suppressed || !location) return false;
  if (location.hostname === GTM_PRODUCTION_HOSTNAME) return true;
  return new URLSearchParams(location.search).get("ga_debug") === "1";
}

export function experimentEventParams(
  ctx: ExperimentContext | null = current,
): Record<string, string> | undefined {
  if (!ctx || suppressed) return undefined;
  return {
    experiment_id: ctx.experimentId,
    variant_id: ctx.variantId,
    landing_page_id: ctx.landingPageId,
  };
}

/** One GA4 `variant_exposure` per page load, after the variant is known. */
export function trackVariantExposure(ctx: ExperimentContext): boolean {
  if (!shouldSendExperimentEvents()) return false;
  return trackGaEvent("variant_exposure", experimentEventParams(ctx) ?? {});
}

/**
 * GA4 `intake_handoff`, sent directly (beacon) so it does not depend on GTM
 * loading before the browser leaves for Bask. Carries experiment ids when the
 * visitor is on an experiment page.
 */
export function sendIntakeHandoffEvent(ctaId: string): boolean {
  if (!shouldSendExperimentEvents()) return false;
  return trackGaEvent(
    "intake_handoff",
    {
      cta_id: ctaId,
      ...(experimentEventParams() ?? {}),
    },
    { beacon: true },
  );
}

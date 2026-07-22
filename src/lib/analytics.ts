import { trackFunnelEventApi } from "@/lib/api/client";
import { capturePageUtms } from "@/lib/utm";
import { trackWaitlistLeadConversion } from "@/lib/ad-conversions";

export type FunnelEventPayload = {
  event_name: string;
  questionnaire_slug?: string;
  questionnaire_version_id?: string;
  step_key?: string;
  experiment_id?: string;
  variant_key?: string;
  properties?: Record<string, unknown>;
};

export function trackFunnelEvent(payload: FunnelEventPayload) {
  void trackFunnelEventApi(payload);
}

// Captured once at module init — reflects whether the browser's *initial* hard
// load (not a SPA route change) was triggered by a reload.
const _initialLoadWasReload =
  (
    performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined
  )?.type === "reload";
let _firstPageViewFired = false;

export function trackPageViewed(
  page: string,
  extra?: { landing_page_slug?: string },
) {
  capturePageUtms();
  // Only the very first call in this JS session can be a page_reloaded — and
  // only if the browser's initial load was a hard reload.  All subsequent SPA
  // route changes (useEffect fires on component mount) are always page_viewed.
  const isReload = !_firstPageViewFired && _initialLoadWasReload;
  _firstPageViewFired = true;
  trackFunnelEvent({
    event_name: isReload ? "page_reloaded" : "page_viewed",
    properties: {
      page,
      ...(extra?.landing_page_slug
        ? { landing_page_slug: extra.landing_page_slug }
        : {}),
    },
  });
}

export function trackStepViewed(
  slug: string,
  stepKey: string,
  meta?: {
    versionId?: string;
    experimentId?: string;
    variantKey?: string;
    stepIndex?: number;
  },
) {
  if (!stepKey?.trim()) return;
  trackFunnelEvent({
    event_name: "step_viewed",
    questionnaire_slug: slug,
    step_key: stepKey,
    questionnaire_version_id: meta?.versionId,
    experiment_id: meta?.experimentId,
    variant_key: meta?.variantKey,
    properties:
      meta?.stepIndex !== undefined
        ? { step_index: meta.stepIndex }
        : undefined,
  });
}

export function trackStepCompleted(
  slug: string,
  stepKey: string,
  durationMs?: number,
  meta?: {
    versionId?: string;
    experimentId?: string;
    variantKey?: string;
    stepIndex?: number;
    ctaId?: string;
  },
) {
  if (!stepKey?.trim()) return;
  trackFunnelEvent({
    event_name: "step_completed",
    questionnaire_slug: slug,
    step_key: stepKey,
    questionnaire_version_id: meta?.versionId,
    experiment_id: meta?.experimentId,
    variant_key: meta?.variantKey,
    properties: {
      ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
      ...(meta?.stepIndex !== undefined ? { step_index: meta.stepIndex } : {}),
      ...(meta?.ctaId ? { cta_id: meta.ctaId } : {}),
    },
  });
}

export function trackCtaClicked(ctaId: string, page?: string) {
  trackFunnelEvent({
    event_name: "cta_clicked",
    properties: {
      cta_id: ctaId,
      ...(page ? { page } : {}),
    },
  });
}

/**
 * First-party funnel event + Meta/Google lead conversion after a successful
 * waitlist/qualify submit. Never pass PHI into ad pixels.
 */
export function trackWaitlistSubmit(page = "qualify") {
  trackCtaClicked("waitlist_submit", page);
  trackWaitlistLeadConversion();
}

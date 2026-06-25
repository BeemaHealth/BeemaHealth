import { trackFunnelEventApi } from "@/lib/api/client";
import { capturePageUtms } from "@/lib/utm";

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

export function trackPageViewed(page: string, extra?: { landing_page_slug?: string }) {
  capturePageUtms();
  const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const eventName = navEntry?.type === "reload" ? "page_reloaded" : "page_viewed";
  trackFunnelEvent({
    event_name: eventName,
    properties: {
      page,
      ...(extra?.landing_page_slug ? { landing_page_slug: extra.landing_page_slug } : {}),
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
  },
) {
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
    },
  });
}

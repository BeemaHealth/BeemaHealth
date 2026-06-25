import { trackFunnelEventApi } from "@/lib/api/client";

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

import type { ComponentType } from "react";

/**
 * One version of an ad landing page body. Head metadata, JSON-LD, and page-view
 * tracking live in the route so every variant is measured identically.
 */
export type LandingVariant = {
  /** Stable id, equals the file name. Sent to GA4 as `variant_id`. */
  id: string;
  /** Human label shown in the local CRO dashboard. */
  label: string;
  Component: ComponentType;
};

export type ExperimentEntry = {
  variant: LandingVariant;
  /** Whole percent of traffic. Live entries in an experiment total 100. */
  weight: number;
};

export type ExperimentConfig = {
  /** Sent to GA4 as `experiment_id`. Changing it resets sticky assignments. */
  experimentId: string;
  /** Live variants only, highest weight first. The first is the prerendered default. */
  variants: readonly ExperimentEntry[];
};

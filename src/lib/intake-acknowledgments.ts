/** Legacy per-item keys stored before single-checkbox intake acknowledgments (MVP). */
export const LEGACY_SAFETY_ACK_KEYS = [
  "no_guarantee",
  "provider_review",
  "side_effects",
  "emergency",
  "compounded",
  "accurate",
  "telehealth",
  "electronic",
  "storage",
] as const;

export const INTAKE_ACKNOWLEDGMENT_KEY = "agreed" as const;

export function isIntakeAcknowledgmentsComplete(
  acks: Record<string, boolean | undefined>,
): boolean {
  if (acks[INTAKE_ACKNOWLEDGMENT_KEY] === true) return true;
  return LEGACY_SAFETY_ACK_KEYS.every((k) => acks[k] === true);
}

/** Normalize drafts to `{ agreed: true }` when complete; drop stale legacy keys. */
export function normalizeSafetyAcknowledgments(
  draft: Record<string, boolean | undefined> | undefined,
): Record<string, boolean> {
  if (!draft || typeof draft !== "object") return {};
  if (isIntakeAcknowledgmentsComplete(draft)) {
    return { [INTAKE_ACKNOWLEDGMENT_KEY]: true };
  }
  return {};
}

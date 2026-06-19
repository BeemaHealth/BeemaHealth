import type { IntakeStatus } from "@/lib/types/mvp";

/** Mirror of backend INTAKE_PORTAL_EDITING_ENABLED — UI hints only; API `can_edit` is authoritative. */
export const INTAKE_PORTAL_EDITING_ENABLED = false;

export function canEditIntake(
  status: IntakeStatus,
  canEditFromApi?: boolean,
): boolean {
  if (canEditFromApi !== undefined) return canEditFromApi;
  if (status === "draft" || status === "more_info_needed") return true;
  if (INTAKE_PORTAL_EDITING_ENABLED) return true;
  return false;
}

export function canEditEligibilitySummary(
  status: IntakeStatus,
  mode: "funnel" | "portal",
  canEditFromApi?: boolean,
): boolean {
  if (status === "draft" && mode === "funnel") return true;
  if (status === "more_info_needed" && canEditFromApi) return true;
  return false;
}

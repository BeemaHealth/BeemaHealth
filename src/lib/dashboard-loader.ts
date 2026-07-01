import { redirect } from "@tanstack/react-router";
import { fetchDashboard } from "@/lib/api/client";
import {
  getEligibility,
  getIntake,
  getReview,
  getSession,
} from "@/lib/storage";
import type { DashboardData } from "@/lib/types/mvp";

export async function loadDashboardData(): Promise<DashboardData> {
  const apiData = await fetchDashboard();
  if (apiData) return apiData;

  const session = getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard" } });
  }
  const intake = getIntake(session.user.id);
  const eligibility = getEligibility(session.user.id);
  const review = getReview(session.user.id);
  return {
    user: session.user,
    intake_status: review?.status ?? intake?.status ?? "draft",
    submitted_at: intake?.submitted_at ?? null,
    treatment_interest: eligibility?.treatment_interest || null,
    patient_note: review?.patient_note ?? "",
    has_active_prescription: false,
    pharmacy_order: null,
    care_events: [],
    refill_requests: [],
  };
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under provider review",
  more_info_needed: "More information needed",
  approved: "Approved",
  not_approved: "Not approved",
  prescription_sent: "Prescription sent",
};

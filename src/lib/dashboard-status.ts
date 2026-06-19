import type { IntakeStatus } from "@/lib/types/mvp";
import { STATUS_LABELS } from "@/lib/dashboard-loader";

export type CareTimelineEvent = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "blue" | "green" | "orange" | "gray";
};

export function getStatusSummary(status: IntakeStatus) {
  const providerReview = (() => {
    switch (status) {
      case "draft":
      case "submitted":
        return { label: "Pending", sub: "Awaiting review" };
      case "under_review":
      case "more_info_needed":
        return { label: "In progress", sub: "Reviewed by your clinician" };
      case "approved":
      case "prescription_sent":
        return { label: "Complete", sub: "Review finished" };
      case "not_approved":
        return { label: "Closed", sub: "Case not approved" };
      default:
        return { label: "Pending", sub: "Awaiting review" };
    }
  })();

  const prescription = (() => {
    switch (status) {
      case "approved":
        return { label: "Approved", sub: "Routing to pharmacy" };
      case "prescription_sent":
        return { label: "Sent", sub: "At partner pharmacy" };
      case "not_approved":
        return { label: "Not approved", sub: "No prescription" };
      default:
        return { label: "Pending review", sub: "Awaiting approval" };
    }
  })();

  const shipping = (() => {
    switch (status) {
      case "prescription_sent":
        return { label: "In progress", sub: "Fulfillment started" };
      case "approved":
        return { label: "Preparing", sub: "Pharmacy routing" };
      default:
        return { label: "Not started", sub: "No order yet" };
    }
  })();

  return { providerReview, prescription, shipping };
}

export function buildCareTimeline(
  status: IntakeStatus,
  submittedAt: string | null,
): CareTimelineEvent[] {
  if (!submittedAt) return [];

  const events: CareTimelineEvent[] = [
    {
      id: "intake-submitted",
      title: "Intake submitted",
      description: "Your medical intake was submitted for clinician review",
      timestamp: submittedAt,
      tone: "blue",
    },
  ];

  if (
    status === "under_review" ||
    status === "more_info_needed" ||
    status === "approved" ||
    status === "not_approved" ||
    status === "prescription_sent"
  ) {
    events.push({
      id: "provider-review",
      title: STATUS_LABELS[status] ?? "Under provider review",
      description: "Your clinician is reviewing your intake",
      timestamp: submittedAt,
      tone:
        status === "more_info_needed" || status === "under_review"
          ? "orange"
          : "gray",
    });
  }

  if (status === "approved" || status === "prescription_sent") {
    events.push({
      id: "approved",
      title: "Treatment approved",
      description: "Your clinician approved your treatment plan",
      timestamp: submittedAt,
      tone: "green",
    });
  }

  if (status === "prescription_sent") {
    events.push({
      id: "prescription-sent",
      title: "Prescription sent",
      description: "Your prescription was sent for fulfillment",
      timestamp: submittedAt,
      tone: "green",
    });
  }

  if (status === "not_approved") {
    events.push({
      id: "not-approved",
      title: "Not approved",
      description:
        "Your clinician determined treatment is not appropriate at this time",
      timestamp: submittedAt,
      tone: "gray",
    });
  }

  return events;
}

/** Refills and side-effect check-ins require an active prescription record. */
export function canManageRefills(hasActivePrescription: boolean): boolean {
  return hasActivePrescription;
}

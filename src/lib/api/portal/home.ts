/** Home summary endpoint (GET /treatments/home/) plus pure view helpers. */

import { apiGet } from "./client";

export type ActionItemKind =
  | "complete_visit"
  | "payment_failed"
  | "upload_id"
  | "upload_proof"
  | "book_visit"
  | "answer_followup"
  | "confirm_address";

export interface ActionItem {
  id: string;
  treatment_id: string | null;
  kind: ActionItemKind;
  title: string;
  body: string;
  is_open: boolean;
  resolved_at: string | null;
  created_at: string;
}

export type QuickActionKind = ActionItemKind | "log_dose" | "request_refill";

export interface QuickAction {
  kind: QuickActionKind;
  label: string;
  treatment_id: string | null;
}

export type TreatmentStatus =
  | "questionnaire_in_progress"
  | "not_eligible"
  | "awaiting_payment"
  | "awaiting_visit_completion"
  | "routing_review"
  | "pending_visit"
  | "needs_patient_action"
  | "canceled"
  | "prescribed"
  | "referred"
  | "active"
  | "refill_due"
  | "paused"
  | "ended";

export interface TreatmentSummary {
  id: string;
  product_slug: string;
  product_name: string;
  plan_name: string;
  status: TreatmentStatus;
  status_label: string;
  tab: "active" | "pending" | "past";
  requested_dose_label: string;
  requested_strength_mg: string | null;
  prescribed_strength_mg: string | null;
  dose_changed_by_doctor: boolean;
  titration_level: number;
  can_cancel: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface UpcomingDates {
  next_dose_at: string | null;
  next_visit_at: string | null;
  overdue_doses: number;
}

/** Decimal values arrive as strings. */
export interface HealthRecords {
  latest_weight_lbs: string | null;
  latest_weight_on: string | null;
  weight_change_lbs: string | null;
  metric_count: number;
  doses_taken: number;
}

export interface HomeSummary {
  quick_actions: QuickAction[];
  action_items: ActionItem[];
  upcoming: UpcomingDates;
  treatments: TreatmentSummary[];
  health_records: HealthRecords;
}

export const HOME_QUERY_KEY = ["portal", "home"] as const;

export function fetchHome(): Promise<HomeSummary> {
  return apiGet<HomeSummary>("/treatments/home/");
}

/** Portal destinations. Other portal screens own these routes. */
export const PORTAL_PATHS = {
  home: "/portal",
  chat: "/portal/chat",
  treatments: "/portal/treatments",
  shots: "/portal/shots",
  account: "/portal/account",
} as const;

/** Where a quick action or action item sends the patient. */
export function destinationFor(kind: QuickActionKind): string {
  switch (kind) {
    case "log_dose":
      return PORTAL_PATHS.shots;
    case "request_refill":
    case "complete_visit":
    case "book_visit":
      return PORTAL_PATHS.treatments;
    case "answer_followup":
      return PORTAL_PATHS.chat;
    case "payment_failed":
    case "confirm_address":
    case "upload_id":
    case "upload_proof":
      return PORTAL_PATHS.account;
  }
}

export type TreatmentTone = "success" | "warning" | "info" | "muted";

export interface TreatmentCardState {
  tone: TreatmentTone;
  /** Short call to action line, empty when nothing is needed. */
  callout: string;
  needsAction: boolean;
  paymentIssue: boolean;
}

/** Derives the card's visual state from the treatment and the open action items. */
export function treatmentCardState(
  t: TreatmentSummary,
  items: ActionItem[],
): TreatmentCardState {
  const mine = items.filter((i) => i.is_open && i.treatment_id === t.id);
  const paymentIssue =
    mine.some((i) => i.kind === "payment_failed") ||
    t.status === "awaiting_payment";
  const needsAction =
    mine.length > 0 ||
    t.status === "needs_patient_action" ||
    t.status === "refill_due";
  if (paymentIssue) {
    return {
      tone: "warning",
      callout: "There was a problem with your payment.",
      needsAction: true,
      paymentIssue: true,
    };
  }
  if (needsAction) {
    const callout =
      mine[0]?.title ??
      (t.status === "refill_due" ? "Your refill is due." : "Action required.");
    return { tone: "warning", callout, needsAction: true, paymentIssue: false };
  }
  if (t.tab === "active")
    return {
      tone: "success",
      callout: "",
      needsAction: false,
      paymentIssue: false,
    };
  if (t.tab === "pending")
    return {
      tone: "info",
      callout: "",
      needsAction: false,
      paymentIssue: false,
    };
  return {
    tone: "muted",
    callout: "",
    needsAction: false,
    paymentIssue: false,
  };
}

export function greetingFor(date: Date, firstName: string): string {
  const h = date.getHours();
  const part =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${part}, ${firstName}` : part;
}

/** "Mon, Oct 5" style date; returns "" for invalid input. */
export function formatShortDate(iso: string | null, timeZone?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(d);
}

export function formatTime(iso: string | null, timeZone?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/** Signed weight delta text, e.g. "-12.4 lbs". Returns "" if unparseable. */
export function formatWeightChange(raw: string | null): string {
  if (raw === null) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded)} lbs`;
}

export function formatWeight(raw: string | null): string {
  if (raw === null) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n * 10) / 10} lbs`;
}

/** Treatments API: treatments, action items, shipments, refills (clinical + fulfillment apps). */
import { apiGet, apiPost } from "./client";
import type { DoseLog, Paginated } from "./shots";

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

export type TreatmentTab = "active" | "pending" | "past";

export interface Treatment {
  id: string;
  product_slug: string;
  product_name: string;
  plan_name: string;
  status: TreatmentStatus;
  status_label: string;
  tab: TreatmentTab;
  requested_dose_label: string;
  requested_strength_mg: string | null;
  prescribed_strength_mg: string | null;
  dose_changed_by_doctor: boolean;
  titration_level: number | null;
  can_cancel: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  kind: "initial" | "titration" | "refill" | "renewal";
  status: "pending" | "scheduled" | "concluded" | "canceled" | "no_show";
  scheduled_at: string | null;
  video_location: string;
  outcome: string;
  submitted_at: string | null;
  concluded_at: string | null;
  doctor_name: string;
}

export interface Prescription {
  id: string;
  drug: string;
  strength: string;
  quantity: number;
  refills: number;
  prescriber_name: string;
  written_at: string | null;
  expires_at: string | null;
}

export interface TreatmentDetail extends Treatment {
  visits: Visit[];
  prescriptions: Prescription[];
  next_dose: DoseLog | null;
}

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

export type ShipmentBatchStatus =
  | "scheduled"
  | "released"
  | "shipped"
  | "skipped"
  | "refunded";

export interface NextShipment {
  id: string;
  treatment_id: string;
  sequence: number;
  /** YYYY-MM-DD */
  due_on: string;
  supply_days: number;
  status: ShipmentBatchStatus;
  blocked_reason: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  status:
    | "shipped"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "delivery_failed";
  shipped_at: string | null;
  delivered_on: string | null;
}

export interface Order {
  id: string;
  treatment_id: string;
  status:
    | "pending"
    | "submitted"
    | "in_fulfillment"
    | "shipped"
    | "delivered"
    | "failed"
    | "canceled";
  fill_type: string;
  submitted_at: string | null;
  created_at: string;
  shipments: Shipment[];
}

export function listTreatments(
  tab?: TreatmentTab,
): Promise<Paginated<Treatment>> {
  return apiGet<Paginated<Treatment>>(
    `/treatments/${tab ? `?tab=${tab}` : ""}`,
  );
}

export function getTreatment(id: string): Promise<TreatmentDetail> {
  return apiGet<TreatmentDetail>(`/treatments/${encodeURIComponent(id)}/`);
}

/** Cancel before submission to the doctor network. Resolves with the updated treatment. */
export function cancelTreatment(id: string): Promise<Treatment> {
  return apiPost<Treatment>(`/treatments/${encodeURIComponent(id)}/cancel/`);
}

export function listActionItems(): Promise<Paginated<ActionItem>> {
  return apiGet<Paginated<ActionItem>>("/treatments/action-items/");
}

export async function getNextShipment(): Promise<NextShipment | null> {
  const res = await apiGet<{ next_shipment: NextShipment | null }>(
    "/fulfillment/next-shipment/",
  );
  return res.next_shipment;
}

export function listOrders(): Promise<Order[]> {
  return apiGet<Order[]>("/fulfillment/orders/");
}

export function requestRefill(treatmentId: string): Promise<Order> {
  return apiPost<Order>("/fulfillment/request-refill/", {
    treatment: treatmentId,
  });
}

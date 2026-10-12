import type {
  ActionItem,
  NextShipment,
  Treatment,
} from "@/lib/api/portal/treatments";
import type { Subscription } from "@/lib/api/portal/billing";
import { formatMg } from "../portal-format";

export const NO_CANCEL_POLICY =
  "Once your visit is submitted to the doctor network, it can no longer be canceled for a refund.";

export const AUTO_RENEW_POLICY =
  "Your prepaid plan renews at the end of its term unless you turn auto-renew off. Turning it off does not refund the current term, and once your visit is submitted to the doctor network it cannot be canceled for a refund.";

const WEEKLY_PRODUCT =
  /semaglutide|tirzepatide|wegovy|zepbound|ozempic|mounjaro/i;

/** Weekly cadence for injectable GLP-1 products. Empty when we do not know. */
export function cadenceLabel(
  t: Pick<Treatment, "product_slug" | "product_name">,
): string {
  return WEEKLY_PRODUCT.test(`${t.product_slug} ${t.product_name}`)
    ? "Weekly"
    : "";
}

/** "7.5 mg - Weekly". The doctor's strength wins over the requested one. */
export function doseLine(t: Treatment): string {
  const strength =
    formatMg(t.prescribed_strength_mg) ||
    formatMg(t.requested_strength_mg) ||
    t.requested_dose_label;
  return [strength, cadenceLabel(t)].filter(Boolean).join(" · ");
}

export type CardState =
  | { kind: "ok" }
  | { kind: "payment_error"; item: ActionItem | null }
  | { kind: "action_required"; item: ActionItem | null };

/** Open action items for one treatment (items with no treatment apply to all). */
export function itemsFor(t: Treatment, items: ActionItem[]): ActionItem[] {
  return items.filter(
    (i) => i.is_open && (i.treatment_id === t.id || i.treatment_id === null),
  );
}

export function cardState(
  t: Treatment,
  items: ActionItem[],
  sub: Subscription | null,
): CardState {
  const mine = itemsFor(t, items);
  const payment = mine.find((i) => i.kind === "payment_failed");
  if (payment) return { kind: "payment_error", item: payment };
  if (sub?.status === "past_due") return { kind: "payment_error", item: null };
  const other = mine[0];
  if (other) return { kind: "action_required", item: other };
  if (t.status === "needs_patient_action")
    return { kind: "action_required", item: null };
  return { kind: "ok" };
}

/** Matches by treatment id when the API provides it, then plan name, then a lone subscription. */
export function matchSubscription(
  t: Treatment,
  subs: Subscription[],
): Subscription | null {
  const live = subs.filter(
    (s) => s.status !== "canceled" && s.status !== "completed",
  );
  const byId = live.find((s) => s.treatment_id === t.id);
  if (byId) return byId;
  const byName = t.plan_name
    ? live.find((s) => s.plan_name === t.plan_name)
    : undefined;
  if (byName) return byName;
  return live.length === 1 && !live[0].treatment_id ? live[0] : null;
}

/** Date text for the "Next payment" row, or a reason there is none. */
export function nextPaymentText(
  sub: Subscription | null,
  formatDate: (v: string | null) => string,
): string {
  if (!sub) return "Not scheduled";
  if (sub.status === "pending_cancel" || sub.cancel_requested) {
    return sub.cancel_effective_on
      ? `Ends ${formatDate(sub.cancel_effective_on)}`
      : "Ending";
  }
  if (sub.commitment === "prepaid_term") {
    if (sub.renews_at_term_end && sub.term_ends_on)
      return `Renews ${formatDate(sub.term_ends_on)}`;
    return sub.paid_through
      ? `Paid through ${formatDate(sub.paid_through)}`
      : "Prepaid";
  }
  return sub.next_bill_on ? formatDate(sub.next_bill_on) : "Not scheduled";
}

export function nextShipmentText(
  shipment: NextShipment | null,
  sub: Subscription | null,
  formatDate: (v: string | null) => string,
): string {
  if (shipment) {
    if (shipment.blocked_reason)
      return `${formatDate(shipment.due_on)} (on hold)`;
    return formatDate(shipment.due_on);
  }
  if (sub?.next_ship_on) return formatDate(sub.next_ship_on);
  return "Not scheduled";
}

export function shipmentFor(
  t: Treatment,
  shipment: NextShipment | null,
): NextShipment | null {
  return shipment && shipment.treatment_id === t.id ? shipment : null;
}

export function canToggleAutoRenew(
  sub: Subscription | null,
): sub is Subscription {
  return !!sub && sub.commitment === "prepaid_term" && sub.status === "active";
}

export function shipsEveryLabel(sub: Subscription | null): string {
  if (!sub) return "";
  if (sub.commitment === "prepaid_term" && sub.term_months)
    return `Prepaid ${sub.term_months} months`;
  return "Ships every month";
}

export function statusTone(
  status: Treatment["status"],
): "success" | "warning" | "info" | "muted" {
  switch (status) {
    case "active":
    case "prescribed":
      return "success";
    case "refill_due":
    case "needs_patient_action":
    case "awaiting_payment":
      return "warning";
    case "paused":
    case "canceled":
    case "ended":
    case "not_eligible":
    case "referred":
      return "muted";
    default:
      return "info";
  }
}

/** Billing API: subscriptions, invoices, payment methods (backend/apps/billing). */
import { apiGet, apiPost } from "./client";

export type SubscriptionStatus =
  | "active"
  | "pending_cancel"
  | "canceled"
  | "completed"
  | "past_due";
export type SubscriptionCommitment = "renewing_monthly" | "prepaid_term";

export interface Subscription {
  id: string;
  plan_name: string;
  status: SubscriptionStatus;
  commitment: SubscriptionCommitment;
  term_months: number | null;
  term_starts_on: string | null;
  term_ends_on: string | null;
  paid_through: string | null;
  next_bill_on: string | null;
  next_ship_on: string | null;
  batches_total: number;
  batches_shipped: number;
  cancel_requested: boolean;
  cancel_effective_on: string | null;
  renews_at_term_end: boolean;
  /** Not in the serializer today; used for matching when the backend adds it. */
  treatment_id?: string | null;
}

export interface InvoiceLine {
  description: string;
  amount_cents: number;
}

export interface InvoiceRefund {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

export type InvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "void";

export interface Invoice {
  id: string;
  kind: "subscription" | "one_time";
  status: InvoiceStatus;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  credit_cents: number;
  total_cents: number;
  refunded_cents: number;
  paid_at: string | null;
  created_at: string;
  subscription: string | null;
  lines: InvoiceLine[];
  refunds: InvoiceRefund[];
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export interface CancelSubscriptionResult {
  outcome: string;
  refunded_cents: number;
  subscription: Subscription;
}

export function listSubscriptions(): Promise<Subscription[]> {
  return apiGet<Subscription[]>("/billing/subscriptions/");
}

export function setAutoRenew(
  id: string,
  enabled: boolean,
): Promise<Subscription> {
  return apiPost<Subscription>(
    `/billing/subscriptions/${encodeURIComponent(id)}/auto-renew/`,
    { enabled },
  );
}

export function cancelSubscription(
  id: string,
): Promise<CancelSubscriptionResult> {
  return apiPost<CancelSubscriptionResult>(
    `/billing/subscriptions/${encodeURIComponent(id)}/cancel/`,
  );
}

export function listInvoices(): Promise<Invoice[]> {
  return apiGet<Invoice[]>("/billing/invoices/");
}

export function listPaymentMethods(): Promise<PaymentMethod[]> {
  return apiGet<PaymentMethod[]>("/billing/payment-methods/");
}

/** Returns the Stripe SetupIntent client secret. Never persist it. */
export async function createSetupIntent(): Promise<string> {
  const res = await apiPost<{ client_secret: string }>(
    "/billing/payment-methods/setup-intent/",
  );
  return res.client_secret;
}

export function setDefaultPaymentMethod(
  paymentMethodId: string,
): Promise<{ id: string; is_default: boolean }> {
  return apiPost<{ id: string; is_default: boolean }>(
    "/billing/payment-methods/default/",
    {
      payment_method_id: paymentMethodId,
    },
  );
}

export async function getStoreCredit(): Promise<number> {
  const res = await apiGet<{ balance_cents: number }>("/billing/credit/");
  return res.balance_cents;
}

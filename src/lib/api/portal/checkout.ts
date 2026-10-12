/**
 * Checkout API: plan list for the selected variant (catalog), coupon preview quote,
 * and the Stripe PaymentIntent creation. Money is integer cents.
 */

import { apiGet, apiPost, ApiError } from "./client";

/** Consent kinds accepted by `POST /billing/checkout/`, exactly as billing expects. */
export const CHECKOUT_CONSENTS = {
  noCancelAfterSubmit: "no_cancel_after_submit",
  autoRenew: "auto_renew",
} as const;

export type CheckoutConsent =
  (typeof CHECKOUT_CONSENTS)[keyof typeof CHECKOUT_CONSENTS];

export type CatalogPlan = {
  slug: string;
  name: string;
  kind: string;
  term_months: number | null;
  billing_commitment?: string;
  current_price_cents: number;
  supply_days_per_shipment?: number | null;
};

export type AppliedCoupon = {
  code: string;
  coupon_id: string;
  kind: string;
  amount_cents: number;
};
export type RejectedCoupon = { code: string; reason: string; message: string };

export type Quote = {
  currency: string;
  base_price_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  credit_cents: number;
  total_cents: number;
  applied_coupons: AppliedCoupon[];
  rejected_coupons: RejectedCoupon[];
  store_credit_balance_cents: number;
};

export type CheckoutResult = {
  invoice_id: string;
  client_secret: string | null;
  requires_payment: boolean;
  quote: Quote;
};

type CatalogProduct = { slug: string; plans?: CatalogPlan[] };

/**
 * Plans for the slugs the server offered, in the server's order. Generic across
 * questionnaires: the catalog is searched for the product(s) that own those slugs.
 * The catalog route is mounted at `/catalog/products/`.
 */
export async function fetchPlansForSlugs(
  slugs: string[],
): Promise<CatalogPlan[]> {
  const wanted = new Set(slugs);
  const found = new Map<string, CatalogPlan>();
  const listed = await apiGet<CatalogProduct[] | { results: CatalogProduct[] }>(
    "/catalog/products/",
  );
  const products = Array.isArray(listed) ? listed : (listed.results ?? []);
  for (const p of products) {
    if (found.size >= wanted.size) break;
    const detail = await apiGet<CatalogProduct>(
      `/catalog/products/${encodeURIComponent(p.slug)}/`,
    );
    for (const plan of detail.plans ?? [])
      if (wanted.has(plan.slug)) found.set(plan.slug, plan);
  }
  return slugs.flatMap((s) =>
    found.has(s) ? [found.get(s) as CatalogPlan] : [],
  );
}

export function fetchQuote(
  plan: string,
  couponCodes: string[],
): Promise<Quote> {
  return apiPost<Quote>("/billing/quote/", {
    plan,
    coupon_codes: couponCodes,
    use_store_credit: false,
  });
}

export function createCheckout(args: {
  plan: string;
  couponCodes: string[];
  consents: CheckoutConsent[];
}): Promise<CheckoutResult> {
  return apiPost<CheckoutResult>("/billing/checkout/", {
    plan: args.plan,
    coupon_codes: args.couponCodes,
    use_store_credit: false,
    consents: args.consents,
  });
}

/** Whole dollars when exact, otherwise dollars and cents. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Per-month price for a multi-month term, or null for one-off and one-month plans. */
export function perMonthCents(
  plan: Pick<CatalogPlan, "term_months" | "current_price_cents">,
): number | null {
  if (!plan.term_months || plan.term_months <= 1) return null;
  return Math.round(plan.current_price_cents / plan.term_months);
}

/** First rejection reason for a code, or the server message of a rejected checkout. */
export function couponProblem(
  quote: Quote | null,
  code: string,
): string | null {
  const hit = quote?.rejected_coupons.find(
    (c) => c.code.toLowerCase() === code.toLowerCase(),
  );
  return hit ? hit.message : null;
}

/** Extracts rejected-coupon messages from a failed checkout (400 `coupon_rejected`). */
export function isCouponRejection(err: unknown): boolean {
  return err instanceof ApiError && /coupon/i.test(err.code);
}

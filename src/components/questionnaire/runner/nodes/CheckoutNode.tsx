import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Check, Lock, Tag } from "lucide-react";
import { ApiError } from "@/lib/api/portal/client";
import {
  CHECKOUT_CONSENTS,
  couponProblem,
  createCheckout,
  fetchPlansForSlugs,
  fetchQuote,
  formatCents,
  perMonthCents,
  type CatalogPlan,
  type CheckoutConsent,
  type Quote,
} from "@/lib/api/portal/checkout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ContinueButton, ErrorNote, FIELD_CLASS, NodeFrame } from "../ui";
import type { NodeRendererProps } from "../types";

/** Exact consent copy shown at checkout. Reviewed by compliance; do not paraphrase. */
export const NO_CANCEL_COPY =
  "I understand that once my visit is submitted to the doctor network, I cannot cancel. Prepaid terms ship in 3-month batches and cannot be canceled for a refund. If I am not prescribed, I am not charged.";
export const AUTO_RENEW_COPY =
  "I understand my plan renews automatically at the end of each billing period, and I can turn off auto-renew in one click from my patient portal at any time.";

const POLL_MS = 1500;
const POLL_ATTEMPTS = 20;

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  const key = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY as
    | string
    | undefined;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

export function isOneTimePlan(plan: CatalogPlan | undefined): boolean {
  return plan?.kind === "starter_pack";
}

export function termLabel(plan: CatalogPlan): string {
  if (isOneTimePlan(plan)) return "One-time starter pack";
  if (!plan.term_months || plan.term_months === 1) return "Monthly";
  return `${plan.term_months} months`;
}

export function CheckoutNode(props: NodeRendererProps) {
  const { node, previous, layout, busy, error, onSubmit, onRefresh } = props;
  const slugs = useMemo(() => node.plan_slugs ?? [], [node.plan_slugs]);
  const previousSlug =
    previous && typeof previous === "object"
      ? ((previous as { plan_slug?: string }).plan_slug ?? null)
      : null;

  const [plans, setPlans] = useState<CatalogPlan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(previousSlug);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponCodes, setCouponCodes] = useState<string[]>([]);
  const [couponNote, setCouponNote] = useState<string | null>(null);
  const [noCancel, setNoCancel] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [stage, setStage] = useState<"review" | "pay" | "finalizing">("review");
  const [starting, setStarting] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await fetchPlansForSlugs(slugs);
      setPlans(list);
      setSelected(
        (cur) =>
          cur ??
          (list.find((p) => p.term_months === 3) ?? list[0])?.slug ??
          null,
      );
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "We could not load your plans.",
      );
    }
  }, [slugs]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const plan = plans?.find((p) => p.slug === selected);
  const oneTime = isOneTimePlan(plan);

  // Server quote for the selected plan and applied coupons (the server is the price authority).
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setQuoteBusy(true);
    fetchQuote(selected, couponCodes)
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        const rejected = q.rejected_coupons[0];
        if (rejected) {
          setCouponNote(rejected.message);
          setCouponCodes((codes) =>
            codes.filter(
              (c) => c.toLowerCase() !== rejected.code.toLowerCase(),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, couponCodes]);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || !selected) return;
    setCouponNote(null);
    setQuoteBusy(true);
    try {
      const q = await fetchQuote(selected, [code]);
      const problem =
        couponProblem(q, code) ?? q.rejected_coupons[0]?.message ?? null;
      if (problem) {
        setCouponNote(problem);
        setQuote(q);
      } else {
        setCouponCodes([code]);
        setCouponInput("");
        setCouponNote(`Code ${code.toUpperCase()} applied.`);
      }
    } catch (err) {
      setCouponNote(
        err instanceof ApiError
          ? err.message
          : "We could not check that code. Try again.",
      );
    } finally {
      setQuoteBusy(false);
    }
  }

  const consentsOk = noCancel && (oneTime || autoRenew);
  const consents: CheckoutConsent[] = [
    CHECKOUT_CONSENTS.noCancelAfterSubmit,
    ...(oneTime ? [] : [CHECKOUT_CONSENTS.autoRenew]),
  ];

  async function waitForNext() {
    setStage("finalizing");
    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      const view = await onRefresh().catch(() => null);
      if (view && view.node.id !== node.id) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    setStageError(
      "Your payment went through, but we are still finishing up. Refresh this page in a moment to continue.",
    );
  }

  async function beginPayment() {
    if (!selected || !consentsOk) return;
    setStageError(null);
    setStarting(true);
    try {
      if (!(await onSubmit({ plan_slug: selected }))) return;
      const result = await createCheckout({
        plan: selected,
        couponCodes,
        consents,
      });
      if (!result.requires_payment || !result.client_secret) {
        await waitForNext();
        return;
      }
      setClientSecret(result.client_secret);
      setStage("pay");
    } catch (err) {
      setStageError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  }

  if (stage === "finalizing") {
    return (
      <NodeFrame
        title="Finishing up"
        body="Your payment is confirmed. We are setting up your visit."
        icon="check"
        align="center"
        tone="success"
      >
        <p role="status" className="text-sm text-muted-foreground">
          This takes a few seconds.
        </p>
        <ErrorNote message={stageError} />
      </NodeFrame>
    );
  }

  const recommended = plans?.reduce<CatalogPlan | null>((best, p) => {
    const pm = perMonthCents(p);
    if (pm === null) return best;
    const bestPm = best ? perMonthCents(best) : null;
    return bestPm === null || pm < bestPm ? p : best;
  }, null);

  return (
    <NodeFrame title={node.title} body={node.body} icon="shield">
      <div className="flex flex-col gap-8">
        {loadError ? (
          <div className="flex flex-col items-start gap-3">
            <ErrorNote message={loadError} />
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadPlans()}
            >
              Try again
            </Button>
          </div>
        ) : !plans ? (
          <div
            className="flex flex-col gap-3"
            aria-busy="true"
            aria-label="Loading plans"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label="Choose a plan"
            className="flex flex-col gap-3"
          >
            {plans.map((p) => {
              const active = p.slug === selected;
              const pm = perMonthCents(p);
              return (
                <button
                  key={p.slug}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={stage === "pay" || starting}
                  onClick={() => setSelected(p.slug)}
                  className={cn(
                    "relative flex items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-left shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
                    active
                      ? "border-primary bg-primary-soft shadow-lift"
                      : "border-border hover:border-foreground/30",
                  )}
                >
                  <span className="flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {active ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-lg font-semibold text-foreground">
                        {termLabel(p)}
                      </span>
                      {pm !== null ? (
                        <span className="text-sm text-muted-foreground">
                          {formatCents(pm)} per month
                        </span>
                      ) : null}
                      {recommended?.slug === p.slug ? (
                        <span className="mt-1 w-fit rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                          Lowest monthly price
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="font-display text-2xl font-semibold text-foreground">
                    {formatCents(p.current_price_cents)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {plans && stage === "review" ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="coupon"
              className="flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <Tag className="h-4 w-4" aria-hidden="true" />
              Promo code
            </label>
            <div className="flex gap-2">
              <input
                id="coupon"
                className={cn(FIELD_CLASS, "h-12 uppercase")}
                value={couponInput}
                maxLength={64}
                autoComplete="off"
                onChange={(e) =>
                  setCouponInput(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyCoupon();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void applyCoupon()}
                disabled={!couponInput.trim() || quoteBusy}
              >
                Apply
              </Button>
            </div>
            {couponNote ? (
              <p
                role="status"
                className={cn(
                  "text-sm font-medium",
                  couponCodes.length ? "text-success" : "text-destructive",
                )}
              >
                {couponNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {quote ? (
          <dl
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-base shadow-soft"
            aria-live="polite"
          >
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">
                {formatCents(quote.subtotal_cents)}
              </dd>
            </div>
            {quote.discount_cents > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Discount</dt>
                <dd className="font-semibold">
                  -{formatCents(quote.discount_cents)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-lg">
              <dt className="font-semibold">Due today</dt>
              <dd className="font-display font-semibold">
                {formatCents(quote.total_cents)}
              </dd>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              If your provider does not prescribe, you are not charged.
            </p>
          </dl>
        ) : null}

        {plans && stage === "review" ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="sr-only">Required acknowledgments</legend>
            <ConsentRow
              id="consent-no-cancel"
              checked={noCancel}
              onChange={setNoCancel}
              copy={NO_CANCEL_COPY}
            />
            {!oneTime ? (
              <ConsentRow
                id="consent-auto-renew"
                checked={autoRenew}
                onChange={setAutoRenew}
                copy={AUTO_RENEW_COPY}
              />
            ) : null}
          </fieldset>
        ) : null}

        {stage === "pay" && clientSecret ? (
          <PaymentStage
            clientSecret={clientSecret}
            total={quote?.total_cents}
            onPaid={() => void waitForNext()}
            onChangePlan={() => {
              setClientSecret(null);
              setStage("review");
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ErrorNote message={stageError ?? error} />
            <ContinueButton
              type="button"
              label={
                layout.node_types?.checkout?.button_label ??
                "Continue to payment"
              }
              busy={starting || busy}
              disabled={!plan || !consentsOk || quoteBusy}
              onClick={() => void beginPayment()}
              savingLabel="Preparing"
            />
            {!consentsOk && plan ? (
              <p className="text-xs text-muted-foreground">
                Please read and check each box above to continue.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </NodeFrame>
  );
}

function ConsentRow({
  id,
  checked,
  onChange,
  copy,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  copy: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-1 h-5 w-5"
      />
      <label
        htmlFor={id}
        className="cursor-pointer text-sm leading-relaxed text-foreground"
      >
        {copy}
      </label>
    </div>
  );
}

function PaymentStage({
  clientSecret,
  total,
  onPaid,
  onChangePlan,
}: {
  clientSecret: string;
  total?: number;
  onPaid: () => void;
  onChangePlan: () => void;
}) {
  const stripe = useRef(getStripe()).current;
  if (!stripe) {
    return (
      <div className="flex flex-col gap-3">
        <ErrorNote message="Payments are not available right now. Please try again shortly or contact us." />
        <Button type="button" variant="outline" onClick={onChangePlan}>
          Back
        </Button>
      </div>
    );
  }
  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: { theme: "stripe", variables: { borderRadius: "16px" } },
      }}
    >
      <PayForm total={total} onPaid={onPaid} onChangePlan={onChangePlan} />
    </Elements>
  );
}

function PayForm({
  total,
  onPaid,
  onChangePlan,
}: {
  total?: number;
  onPaid: () => void;
  onChangePlan: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    setPaying(false);
    if (error) {
      setPayError(
        error.message ??
          "Your payment did not go through. Please check your details and try again.",
      );
      return;
    }
    onPaid();
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-5">
      <PaymentElement />
      <ErrorNote message={payError} />
      <ContinueButton
        label={total !== undefined ? `Pay ${formatCents(total)}` : "Pay now"}
        busy={paying}
        disabled={!stripe || !elements}
        savingLabel="Processing"
      />
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Payments are processed securely by Stripe.
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={onChangePlan}
        disabled={paying}
      >
        Change plan or code
      </Button>
    </form>
  );
}

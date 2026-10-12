import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Subscription } from "@/lib/api/portal/billing";
import type { Message } from "@/lib/api/portal/chat";
import type { Treatment } from "@/lib/api/portal/treatments";
import { MessageBubble, PendingBubble } from "../chat/MessageBubble";
import { ErrorState, EmptyState } from "../PortalStates";
import {
  TreatmentPlanCard,
  type TreatmentPlanCardProps,
} from "../treatments/TreatmentPlanCard";

const treatment: Treatment = {
  id: "t1",
  product_slug: "tirzepatide",
  product_name: "Tirzepatide",
  plan_name: "6 month plan",
  status: "active",
  status_label: "Active",
  tab: "active",
  requested_dose_label: "",
  requested_strength_mg: "7.50",
  prescribed_strength_mg: null,
  dose_changed_by_doctor: false,
  titration_level: null,
  can_cancel: false,
  started_at: null,
  ended_at: null,
  created_at: "",
};

const sub: Subscription = {
  id: "s1",
  plan_name: "6 month plan",
  status: "active",
  commitment: "prepaid_term",
  term_months: 6,
  term_starts_on: null,
  term_ends_on: "2027-03-01",
  paid_through: "2027-03-01",
  next_bill_on: null,
  next_ship_on: "2026-10-10",
  batches_total: 6,
  batches_shipped: 1,
  cancel_requested: false,
  cancel_effective_on: null,
  renews_at_term_end: true,
};

function card(over: Partial<TreatmentPlanCardProps> = {}): string {
  const props: TreatmentPlanCardProps = {
    treatment,
    subscription: sub,
    shipment: null,
    items: [],
    onFixPayment: vi.fn(),
    onAction: vi.fn(),
    onCancel: vi.fn(),
    onToggleAutoRenew: vi.fn(),
    onRefill: vi.fn(),
    ...over,
  };
  return renderToStaticMarkup(
    createElement("ul", null, createElement(TreatmentPlanCard, props)),
  );
}

describe("TreatmentPlanCard", () => {
  it("shows dose, next shipment and next payment as separate rows", () => {
    const html = card();
    expect(html).toContain("7.5 mg");
    expect(html).toContain("Next shipment:");
    expect(html).toContain("Next payment:");
    expect(html).toContain("Auto-renew at end of term");
    expect(html).toContain("cannot be canceled for a refund");
  });
  it("hides cancel unless the API says can_cancel", () => {
    expect(card()).not.toContain("Cancel treatment");
    const html = card({ treatment: { ...treatment, can_cancel: true } });
    expect(html).toContain("Cancel treatment");
  });
  it("hides the auto-renew toggle for monthly plans", () => {
    expect(
      card({ subscription: { ...sub, commitment: "renewing_monthly" } }),
    ).not.toContain("Auto-renew at end of term");
  });
  it("renders payment error and action required states", () => {
    const payment = card({
      items: [
        {
          id: "i",
          treatment_id: "t1",
          kind: "payment_failed",
          title: "Card declined",
          body: "",
          is_open: true,
          resolved_at: null,
          created_at: "",
        },
      ],
    });
    expect(payment).toContain("Card declined");
    expect(payment).toContain("Update payment method");
    expect(
      card({ treatment: { ...treatment, status: "needs_patient_action" } }),
    ).toContain("Action required");
  });
  it("offers a refill when refill is due", () => {
    expect(
      card({ treatment: { ...treatment, status: "refill_due" } }),
    ).toContain("Request refill");
  });
});

describe("chat bubbles", () => {
  const message: Message = {
    id: "m1",
    direction: "out",
    sender_role: "customer_success",
    sender_display_name: "",
    body: "<b>hello</b>",
    delivery_status: "delivered",
    attachments: [],
    created_at: "2026-10-05T10:00:00Z",
  };
  it("labels the sender role and escapes the body", () => {
    const html = renderToStaticMarkup(
      createElement("ul", null, createElement(MessageBubble, { message })),
    );
    expect(html).toContain("Customer Success Manager");
    expect(html).toContain("&lt;b&gt;hello&lt;/b&gt;");
  });
  it("shows retry and discard for a failed pending message", () => {
    const html = renderToStaticMarkup(
      createElement(
        "ul",
        null,
        createElement(PendingBubble, {
          pending: {
            localId: "l",
            body: "hi",
            createdAt: "",
            status: "failed",
          },
          onRetry: vi.fn(),
          onDiscard: vi.fn(),
        }),
      ),
    );
    expect(html).toContain("Message not sent");
    expect(html).toContain("Retry");
    expect(html).toContain("Discard");
  });
  it("shows a sending state", () => {
    const html = renderToStaticMarkup(
      createElement(
        "ul",
        null,
        createElement(PendingBubble, {
          pending: {
            localId: "l",
            body: "hi",
            createdAt: "",
            status: "sending",
          },
          onRetry: vi.fn(),
          onDiscard: vi.fn(),
        }),
      ),
    );
    expect(html).toContain("Sending");
  });
});

describe("portal states", () => {
  it("renders error and empty states accessibly", () => {
    expect(
      renderToStaticMarkup(
        createElement(ErrorState, { error: new Error("x") }),
      ),
    ).toContain('role="alert"');
    expect(
      renderToStaticMarkup(
        createElement(EmptyState, { title: "Nothing here" }),
      ),
    ).toContain("Nothing here");
  });
});

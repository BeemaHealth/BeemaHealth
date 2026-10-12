// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement as h } from "react";

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => null) }));
vi.mock("@/lib/api/portal/checkout", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/portal/checkout")>()),
  fetchPlansForSlugs: vi.fn(),
  fetchQuote: vi.fn(),
  createCheckout: vi.fn(),
}));

import * as checkout from "@/lib/api/portal/checkout";
import { CheckoutNode } from "../nodes/CheckoutNode";
import { installBrowserStubs, node, props } from "./helpers";

beforeAll(installBrowserStubs);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkout.fetchPlansForSlugs).mockResolvedValue([
    {
      slug: "sema-monthly",
      name: "Monthly",
      kind: "subscription",
      term_months: 1,
      current_price_cents: 29900,
    },
    {
      slug: "sema-3",
      name: "3 month",
      kind: "prepaid",
      term_months: 3,
      current_price_cents: 75000,
    },
    {
      slug: "sema-12",
      name: "12 month",
      kind: "prepaid",
      term_months: 12,
      current_price_cents: 240000,
    },
  ]);
  vi.mocked(checkout.fetchQuote).mockImplementation(async (_plan, codes) => ({
    currency: "usd",
    base_price_cents: 75000,
    subtotal_cents: 75000,
    discount_cents: codes.includes("SAVE10") ? 7500 : 0,
    credit_cents: 0,
    total_cents: codes.includes("SAVE10") ? 67500 : 75000,
    applied_coupons: [],
    rejected_coupons: codes.includes("BAD")
      ? [{ code: "BAD", reason: "expired", message: "That code has expired." }]
      : [],
    store_credit_balance_cents: 0,
  }));
});
afterEach(cleanup);

const checkoutNode = node({
  id: "checkout",
  type: "checkout",
  title: "Choose your plan",
  plan_slugs: ["sema-monthly", "sema-3", "sema-12"],
});

function mount() {
  const p = props(checkoutNode, {
    layout: {
      node_types: { checkout: { button_label: "Continue to payment" } },
    },
  });
  render(h(CheckoutNode, p.props));
  return p;
}

describe("CheckoutNode", () => {
  it("shows the plans the server offered for the variant", async () => {
    mount();
    expect(
      await screen.findByRole("radio", { name: /^monthly/i }),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: /3 months/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /12 months/i })).toBeTruthy();
    expect(screen.getByText("$2,400")).toBeTruthy();
    expect(screen.getByText("$200 per month")).toBeTruthy();
    expect(screen.getByText("Lowest monthly price")).toBeTruthy();
  });

  it("gates the checkout button on both explicit consents", async () => {
    const user = userEvent.setup();
    const p = mount();
    await screen.findByRole("radio", { name: /3 months/i });
    await waitFor(() => expect(checkout.fetchQuote).toHaveBeenCalled());
    const button = screen.getByRole("button", { name: "Continue to payment" });
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(true),
    );

    await user.click(screen.getByRole("checkbox", { name: /cannot cancel/i }));
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await user.click(
      screen.getByRole("checkbox", { name: /renews automatically/i }),
    );
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false),
    );

    vi.mocked(checkout.createCheckout).mockResolvedValue({
      invoice_id: "inv",
      client_secret: null,
      requires_payment: false,
      quote: {} as never,
    });
    await user.click(button);
    await waitFor(() =>
      expect(p.onSubmit).toHaveBeenCalledWith({ plan_slug: "sema-3" }),
    );
    expect(checkout.createCheckout).toHaveBeenCalledWith({
      plan: "sema-3",
      couponCodes: [],
      consents: ["no_cancel_after_submit", "auto_renew"],
    });
  });

  it("unchecking a consent disables the button again", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole("radio", { name: /3 months/i });
    await user.click(screen.getByRole("checkbox", { name: /cannot cancel/i }));
    await user.click(
      screen.getByRole("checkbox", { name: /renews automatically/i }),
    );
    const button = screen.getByRole("button", {
      name: "Continue to payment",
    }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await user.click(
      screen.getByRole("checkbox", { name: /renews automatically/i }),
    );
    expect(button.disabled).toBe(true);
  });

  it("applies a valid coupon and shows the server's discount", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole("radio", { name: /3 months/i });
    await user.type(screen.getByLabelText(/promo code/i), "SAVE10");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText(/applied/i);
    await waitFor(() => expect(screen.getByText("-$75")).toBeTruthy());
    expect(screen.getByText("$675")).toBeTruthy();
  });

  it("shows the server's reason when a coupon is rejected", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole("radio", { name: /3 months/i });
    await user.type(screen.getByLabelText(/promo code/i), "BAD");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("That code has expired.")).toBeTruthy();
  });

  it("only requires the no-cancel consent for a one-time starter pack", async () => {
    vi.mocked(checkout.fetchPlansForSlugs).mockResolvedValue([
      {
        slug: "starter",
        name: "Starter pack",
        kind: "starter_pack",
        term_months: null,
        current_price_cents: 9900,
      },
    ]);
    const user = userEvent.setup();
    render(
      h(
        CheckoutNode,
        props(
          node({
            id: "checkout",
            type: "checkout",
            title: "Plan",
            plan_slugs: ["starter"],
          }),
        ).props,
      ),
    );
    await screen.findByRole("radio", { name: /starter pack/i });
    expect(
      screen.queryByRole("checkbox", { name: /renews automatically/i }),
    ).toBeNull();
    const button = screen.getByRole("button", {
      name: "Continue to payment",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /cannot cancel/i }));
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it("offers a retry when plans fail to load", async () => {
    vi.mocked(checkout.fetchPlansForSlugs).mockRejectedValueOnce(
      new Error("nope"),
    );
    render(h(CheckoutNode, props(checkoutNode).props));
    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeTruthy();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock("./client", () => ({
  ApiError: class extends Error {},
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));

import {
  CHECKOUT_CONSENTS,
  couponProblem,
  createCheckout,
  fetchPlansForSlugs,
  fetchQuote,
  formatCents,
  perMonthCents,
  type Quote,
} from "./checkout";

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
});

describe("checkout api", () => {
  it("finds offered plans across products in the server order", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/catalog/products/")
        return [{ slug: "p1" }, { slug: "p2" }];
      if (path === "/catalog/products/p1/")
        return {
          slug: "p1",
          plans: [
            { slug: "b", current_price_cents: 1 },
            { slug: "hidden", current_price_cents: 1 },
          ],
        };
      return { slug: "p2", plans: [{ slug: "a", current_price_cents: 1 }] };
    });
    const plans = await fetchPlansForSlugs(["a", "b", "missing"]);
    expect(plans.map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("quotes with coupon codes", async () => {
    apiPost.mockResolvedValue({});
    await fetchQuote("semaglutide-3month", ["SAVE10"]);
    expect(apiPost).toHaveBeenCalledWith("/billing/quote/", {
      plan: "semaglutide-3month",
      coupon_codes: ["SAVE10"],
      use_store_credit: false,
    });
  });

  it("sends consents exactly as billing expects", async () => {
    apiPost.mockResolvedValue({});
    await createCheckout({
      plan: "p",
      couponCodes: [],
      consents: [
        CHECKOUT_CONSENTS.noCancelAfterSubmit,
        CHECKOUT_CONSENTS.autoRenew,
      ],
    });
    expect(apiPost).toHaveBeenCalledWith("/billing/checkout/", {
      plan: "p",
      coupon_codes: [],
      use_store_credit: false,
      consents: ["no_cancel_after_submit", "auto_renew"],
    });
  });

  it("formats money and per-month math", () => {
    expect(formatCents(29900)).toBe("$299");
    expect(formatCents(29950)).toBe("$299.50");
    expect(perMonthCents({ term_months: 3, current_price_cents: 90000 })).toBe(
      30000,
    );
    expect(
      perMonthCents({ term_months: 1, current_price_cents: 90000 }),
    ).toBeNull();
    expect(
      perMonthCents({ term_months: null, current_price_cents: 5 }),
    ).toBeNull();
  });

  it("finds a coupon rejection message case-insensitively", () => {
    const q = {
      rejected_coupons: [
        {
          code: "Save10",
          reason: "expired",
          message: "That code has expired.",
        },
      ],
    } as unknown as Quote;
    expect(couponProblem(q, "SAVE10")).toBe("That code has expired.");
    expect(couponProblem(q, "OTHER")).toBeNull();
    expect(couponProblem(null, "x")).toBeNull();
  });
});

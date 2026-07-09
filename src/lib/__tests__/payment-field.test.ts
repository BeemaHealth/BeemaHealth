import { describe, expect, it } from "vitest";
import {
  isPaymentField,
  PAYMENT_HOLD_MODES,
  PAYMENT_HOLD_PLUGIN_ID,
} from "@/lib/questionnaire/payment-field";

describe("isPaymentField", () => {
  it("matches a plugin field with the stripe_payment_hold plugin_id", () => {
    expect(
      isPaymentField({
        field_type: "plugin",
        plugin_id: PAYMENT_HOLD_PLUGIN_ID,
      }),
    ).toBe(true);
  });

  it("rejects other plugin ids", () => {
    expect(
      isPaymentField({ field_type: "plugin", plugin_id: "intake_review" }),
    ).toBe(false);
  });

  it("rejects non-plugin field types even with a matching plugin_id", () => {
    expect(
      isPaymentField({ field_type: "text", plugin_id: PAYMENT_HOLD_PLUGIN_ID }),
    ).toBe(false);
  });

  it("exposes the two supported payment modes", () => {
    expect(PAYMENT_HOLD_MODES).toEqual(["auth_hold", "setup_only"]);
  });
});

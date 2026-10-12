import { describe, expect, it } from "vitest";
import { displayFirstName, initials, isLoginPath, isValidEmail } from "../auth";
import {
  destinationFor,
  formatShortDate,
  formatWeight,
  formatWeightChange,
  greetingFor,
  treatmentCardState,
  type ActionItem,
  type TreatmentSummary,
} from "../home";

function treatment(over: Partial<TreatmentSummary> = {}): TreatmentSummary {
  return {
    id: "t1",
    product_slug: "weight-loss",
    product_name: "Weight loss program",
    plan_name: "3 month",
    status: "active",
    status_label: "Active",
    tab: "active",
    requested_dose_label: "2.5 mg",
    requested_strength_mg: "2.50",
    prescribed_strength_mg: null,
    dose_changed_by_doctor: false,
    titration_level: 1,
    can_cancel: false,
    started_at: null,
    ended_at: null,
    created_at: "2026-10-01T00:00:00Z",
    ...over,
  };
}

function item(over: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "a1",
    treatment_id: "t1",
    kind: "complete_visit",
    title: "Complete your visit",
    body: "",
    is_open: true,
    resolved_at: null,
    created_at: "2026-10-01T00:00:00Z",
    ...over,
  };
}

describe("treatmentCardState", () => {
  it("is calm for an active treatment with no items", () => {
    expect(treatmentCardState(treatment(), [])).toMatchObject({
      tone: "success",
      needsAction: false,
      paymentIssue: false,
    });
  });
  it("flags a payment failure", () => {
    const s = treatmentCardState(treatment(), [
      item({ kind: "payment_failed", title: "Fix payment" }),
    ]);
    expect(s).toMatchObject({
      tone: "warning",
      paymentIssue: true,
      needsAction: true,
    });
  });
  it("flags awaiting payment as a payment issue", () => {
    const s = treatmentCardState(
      treatment({ status: "awaiting_payment", tab: "pending" }),
      [],
    );
    expect(s.paymentIssue).toBe(true);
  });
  it("uses the action item title as the callout", () => {
    const s = treatmentCardState(
      treatment({ status: "awaiting_visit_completion", tab: "pending" }),
      [item()],
    );
    expect(s.callout).toBe("Complete your visit");
    expect(s.needsAction).toBe(true);
  });
  it("ignores items for other treatments and closed items", () => {
    const s = treatmentCardState(treatment(), [
      item({ treatment_id: "other" }),
      item({ is_open: false }),
    ]);
    expect(s.needsAction).toBe(false);
  });
  it("flags refill due", () => {
    expect(
      treatmentCardState(treatment({ status: "refill_due" }), []).callout,
    ).toMatch(/refill/i);
  });
  it("is info for pending and muted for past", () => {
    expect(
      treatmentCardState(
        treatment({ status: "pending_visit", tab: "pending" }),
        [],
      ).tone,
    ).toBe("info");
    expect(
      treatmentCardState(treatment({ status: "ended", tab: "past" }), []).tone,
    ).toBe("muted");
  });
});

describe("destinationFor", () => {
  it("routes each kind somewhere inside the portal", () => {
    const kinds = [
      "complete_visit",
      "payment_failed",
      "upload_id",
      "upload_proof",
      "book_visit",
      "answer_followup",
      "confirm_address",
      "log_dose",
      "request_refill",
    ] as const;
    for (const k of kinds) expect(destinationFor(k)).toMatch(/^\/portal\//);
  });
});

describe("formatters", () => {
  it("greets by time of day", () => {
    expect(greetingFor(new Date(2026, 9, 5, 8), "Sam")).toBe(
      "Good morning, Sam",
    );
    expect(greetingFor(new Date(2026, 9, 5, 14), "Sam")).toBe(
      "Good afternoon, Sam",
    );
    expect(greetingFor(new Date(2026, 9, 5, 21), "")).toBe("Good evening");
  });
  it("formats dates and rejects bad input", () => {
    expect(formatShortDate("2026-10-05T12:00:00Z", "UTC")).toBe("Mon, Oct 5");
    expect(formatShortDate(null)).toBe("");
    expect(formatShortDate("not a date")).toBe("");
  });
  it("formats weight values", () => {
    expect(formatWeight("201.46")).toBe("201.5 lbs");
    expect(formatWeight(null)).toBe("");
    expect(formatWeightChange("-12.44")).toBe("-12.4 lbs");
    expect(formatWeightChange("3")).toBe("+3 lbs");
    expect(formatWeightChange("0.00")).toBe("0 lbs");
    expect(formatWeightChange("abc")).toBe("");
  });
});

describe("auth helpers", () => {
  it("validates email shape and length", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("  a@b.co ")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail(`${"a".repeat(250)}@b.co`)).toBe(false);
    expect(isValidEmail("a b@c.co")).toBe(false);
  });
  it("identifies login paths", () => {
    expect(isLoginPath("/portal/login")).toBe(true);
    expect(isLoginPath("/portal/login/verify")).toBe(true);
    expect(isLoginPath("/portal")).toBe(false);
    expect(isLoginPath("/portal/loginx")).toBe(false);
  });
  it("derives names and initials", () => {
    const u = { first_name: "", last_name: "", email: "jo@x.co" };
    expect(displayFirstName(u)).toBe("jo");
    expect(initials(u)).toBe("J");
    expect(initials({ ...u, first_name: "Ada", last_name: "Lovelace" })).toBe(
      "AL",
    );
  });
});

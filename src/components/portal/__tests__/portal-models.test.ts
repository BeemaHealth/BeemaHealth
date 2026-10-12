import { describe, expect, it } from "vitest";
import type { Subscription } from "@/lib/api/portal/billing";
import type { Conversation, Message } from "@/lib/api/portal/chat";
import type { DoseLog, HealthMetric } from "@/lib/api/portal/shots";
import type { ActionItem, Treatment } from "@/lib/api/portal/treatments";
import {
  ACCOUNT_TABS,
  emptyAddress,
  exportFilename,
  formatPhone,
  isCardExpired,
  normalizeAddress,
  openDataRequest,
  parseAccountTab,
  validateAddress,
  validateName,
  validatePhone,
} from "../account/account-model";
import {
  buildThreadItems,
  previewOf,
  roleLabel,
  sortThreads,
  unreadCount,
  validateAttachment,
  validateBody,
} from "../chat/chat-model";
import {
  formatDate,
  formatMg,
  formatMoney,
  parseDate,
  toYmd,
} from "../portal-format";
import {
  doseTitle,
  groupByMonth,
  initialDoseForm,
  metricsForDate,
  overdueSummary,
  splitDoses,
  toTakenAtIso,
  validateDoseForm,
  type DoseFormValues,
} from "../shots/shots-model";
import {
  cadenceLabel,
  canToggleAutoRenew,
  cardState,
  doseLine,
  matchSubscription,
  nextPaymentText,
  nextShipmentText,
} from "../treatments/treatment-model";

const treatment = (over: Partial<Treatment> = {}): Treatment => ({
  id: "t1",
  product_slug: "tirzepatide",
  product_name: "Tirzepatide",
  plan_name: "6 month plan",
  status: "active",
  status_label: "Active",
  tab: "active",
  requested_dose_label: "",
  requested_strength_mg: "5.00",
  prescribed_strength_mg: "7.50",
  dose_changed_by_doctor: true,
  titration_level: 2,
  can_cancel: false,
  started_at: null,
  ended_at: null,
  created_at: "2026-09-01T00:00:00Z",
  ...over,
});

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  plan_name: "6 month plan",
  status: "active",
  commitment: "prepaid_term",
  term_months: 6,
  term_starts_on: "2026-09-01",
  term_ends_on: "2027-03-01",
  paid_through: "2027-03-01",
  next_bill_on: null,
  next_ship_on: "2026-10-10",
  batches_total: 6,
  batches_shipped: 1,
  cancel_requested: false,
  cancel_effective_on: null,
  renews_at_term_end: true,
  ...over,
});

const item = (over: Partial<ActionItem> = {}): ActionItem => ({
  id: "i1",
  treatment_id: "t1",
  kind: "complete_visit",
  title: "Complete your visit",
  body: "",
  is_open: true,
  resolved_at: null,
  created_at: "2026-10-01T00:00:00Z",
  ...over,
});

const dose = (over: Partial<DoseLog> = {}): DoseLog => ({
  id: "d1",
  treatment: "t1",
  scheduled_at: "2026-10-11T16:14:00",
  taken_at: null,
  status: "scheduled",
  strength_mg: "7.50",
  dose_number: 4,
  injection_site: "",
  pain_0_5: null,
  notes: "",
  entered_by: "patient",
  auto_generated: true,
  is_overdue: false,
  created_at: "2026-09-01T00:00:00Z",
  ...over,
});

describe("portal-format", () => {
  it("parses bare dates as local calendar dates", () => {
    const d = parseDate("2026-10-07");
    expect(d && toYmd(d)).toBe("2026-10-07");
    expect(formatDate("2026-10-07")).toBe("Oct 7, 2026");
    expect(formatDate(null, "none")).toBe("none");
    expect(parseDate("not a date")).toBeNull();
  });
  it("formats mg and money", () => {
    expect(formatMg("7.50")).toBe("7.5 mg");
    expect(formatMg(null)).toBe("");
    expect(formatMg("abc")).toBe("");
    expect(formatMoney(24900)).toBe("$249.00");
  });
});

describe("treatment model", () => {
  it("labels weekly cadence for GLP-1 products only", () => {
    expect(cadenceLabel(treatment())).toBe("Weekly");
    expect(
      cadenceLabel(
        treatment({ product_slug: "nad-plus", product_name: "NAD+" }),
      ),
    ).toBe("");
  });
  it("prefers the doctor strength", () => {
    expect(doseLine(treatment())).toBe("7.5 mg · Weekly");
    expect(doseLine(treatment({ prescribed_strength_mg: null }))).toBe(
      "5 mg · Weekly",
    );
  });
  it("detects payment error before action required", () => {
    const items = [
      item(),
      item({ id: "i2", kind: "payment_failed", title: "Card declined" }),
    ];
    const state = cardState(treatment(), items, null);
    expect(state.kind).toBe("payment_error");
  });
  it("flags past due subscriptions as payment errors", () => {
    expect(cardState(treatment(), [], sub({ status: "past_due" })).kind).toBe(
      "payment_error",
    );
  });
  it("ignores closed items and items for other treatments", () => {
    const items = [item({ is_open: false }), item({ treatment_id: "other" })];
    expect(cardState(treatment(), items, null).kind).toBe("ok");
  });
  it("treats needs_patient_action status as action required", () => {
    expect(
      cardState(treatment({ status: "needs_patient_action" }), [], null).kind,
    ).toBe("action_required");
  });
  it("matches subscriptions by id, plan name, then a lone subscription", () => {
    expect(
      matchSubscription(treatment(), [
        sub({ id: "x", plan_name: "other" }),
        sub({ treatment_id: "t1" }),
      ])?.treatment_id,
    ).toBe("t1");
    expect(
      matchSubscription(treatment(), [
        sub({ id: "a", plan_name: "nope" }),
        sub({ id: "b" }),
      ])?.id,
    ).toBe("b");
    expect(
      matchSubscription(treatment({ plan_name: "" }), [
        sub({ plan_name: "zzz" }),
      ])?.id,
    ).toBe("s1");
    expect(
      matchSubscription(treatment({ plan_name: "" }), [
        sub({ status: "canceled" }),
      ]),
    ).toBeNull();
  });
  it("describes the next payment and shipment separately", () => {
    const f = (v: string | null) => formatDate(v);
    expect(nextPaymentText(null, f)).toBe("Not scheduled");
    expect(nextPaymentText(sub(), f)).toBe("Renews Mar 1, 2027");
    expect(nextPaymentText(sub({ renews_at_term_end: false }), f)).toBe(
      "Paid through Mar 1, 2027",
    );
    expect(
      nextPaymentText(
        sub({ commitment: "renewing_monthly", next_bill_on: "2026-10-07" }),
        f,
      ),
    ).toBe("Oct 7, 2026");
    expect(
      nextPaymentText(
        sub({ cancel_requested: true, cancel_effective_on: "2026-11-01" }),
        f,
      ),
    ).toBe("Ends Nov 1, 2026");
    const ship = {
      id: "b",
      treatment_id: "t1",
      sequence: 2,
      due_on: "2026-10-10",
      supply_days: 28,
      status: "scheduled" as const,
      blocked_reason: "",
    };
    expect(nextShipmentText(ship, null, f)).toBe("Oct 10, 2026");
    expect(
      nextShipmentText({ ...ship, blocked_reason: "address" }, null, f),
    ).toBe("Oct 10, 2026 (on hold)");
    expect(nextShipmentText(null, sub(), f)).toBe("Oct 10, 2026");
  });
  it("only offers the auto-renew toggle for active prepaid plans", () => {
    expect(canToggleAutoRenew(sub())).toBe(true);
    expect(canToggleAutoRenew(sub({ commitment: "renewing_monthly" }))).toBe(
      false,
    );
    expect(canToggleAutoRenew(sub({ status: "past_due" }))).toBe(false);
    expect(canToggleAutoRenew(null)).toBe(false);
  });
});

describe("shots model", () => {
  const doses = [
    dose({ id: "up2", scheduled_at: "2026-10-18T16:14:00" }),
    dose({ id: "up1", scheduled_at: "2026-10-11T16:14:00" }),
    dose({ id: "od", scheduled_at: "2026-09-13T16:14:00", is_overdue: true }),
    dose({
      id: "h1",
      status: "taken",
      scheduled_at: "2026-10-04T16:14:00",
      taken_at: "2026-10-04T16:14:00",
    }),
    dose({
      id: "h2",
      status: "taken",
      scheduled_at: "2026-09-27T16:14:00",
      taken_at: "2026-09-27T16:14:00",
    }),
    dose({ id: "h3", status: "skipped", scheduled_at: "2026-09-20T16:14:00" }),
  ];
  it("splits upcoming, overdue and history in order", () => {
    const s = splitDoses(doses);
    expect(s.upcoming.map((d) => d.id)).toEqual(["up1", "up2"]);
    expect(s.overdue.map((d) => d.id)).toEqual(["od"]);
    expect(s.history.map((d) => d.id)).toEqual(["h1", "h2", "h3"]);
  });
  it("groups history by month, newest first", () => {
    const groups = groupByMonth(splitDoses(doses).history);
    expect(groups.map((g) => g.label)).toEqual([
      "October 2026",
      "September 2026",
    ]);
    expect(groups[1].doses).toHaveLength(2);
  });
  it("finds metrics for a date", () => {
    const m = (kind: HealthMetric["kind"], on_date: string): HealthMetric => ({
      id: kind + on_date,
      kind,
      on_date,
      value: "180.00",
      unit: "",
      notes: "",
      created_at: "",
    });
    const day = metricsForDate(
      [m("weight", "2026-10-04"), m("calories", "2026-10-05")],
      "2026-10-04",
    );
    expect(day.weight?.kind).toBe("weight");
    expect(day.calories).toBeNull();
  });
  it("summarizes overdue overflow", () => {
    expect(overdueSummary(7, 4)).toBe("3 more overdue doses to add.");
    expect(overdueSummary(5, 4)).toBe("1 more overdue dose to add.");
    expect(overdueSummary(3, 4)).toBe("");
  });
  it("titles a dose with product and strength", () => {
    expect(doseTitle(dose(), "Tirzepatide")).toBe("Tirzepatide · 7.5 mg");
    expect(doseTitle(dose({ strength_mg: null }), "")).toBe("");
  });

  const base: DoseFormValues = {
    takenDate: "2026-10-04",
    takenTime: "16:14",
    strengthMg: "7.5",
    injectionSite: "Arm - Upper left",
    pain: "1",
    notes: "ok",
    weight: "180",
    calories: "1800",
    exercise: "30",
  };
  const now = new Date(2026, 9, 5, 12, 0, 0);
  it("accepts a valid form", () => {
    expect(validateDoseForm(base, now)).toEqual({});
  });
  it("rejects future, out of range and non numeric values", () => {
    expect(
      validateDoseForm({ ...base, takenDate: "2026-10-09" }, now).takenDate,
    ).toMatch(/future/);
    expect(validateDoseForm({ ...base, pain: "6" }, now).pain).toBeTruthy();
    expect(
      validateDoseForm({ ...base, weight: "10" }, now).weight,
    ).toBeTruthy();
    expect(
      validateDoseForm({ ...base, calories: "1e3" }, now).calories,
    ).toBeTruthy();
    expect(
      validateDoseForm({ ...base, strengthMg: "0" }, now).strengthMg,
    ).toBeTruthy();
    expect(
      validateDoseForm({ ...base, notes: "x".repeat(2001) }, now).notes,
    ).toBeTruthy();
    expect(
      validateDoseForm({ ...base, takenDate: "" }, now).takenDate,
    ).toBeTruthy();
  });
  it("rejects injection style input in numeric fields", () => {
    expect(
      validateDoseForm({ ...base, weight: "1; DROP TABLE" }, now).weight,
    ).toBeTruthy();
    expect(
      validateDoseForm({ ...base, exercise: "<script>" }, now).exercise,
    ).toBeTruthy();
  });
  it("seeds the form from an existing taken dose", () => {
    const v = initialDoseForm(
      dose({
        status: "taken",
        taken_at: "2026-10-04T16:14:00",
        pain_0_5: 0,
        injection_site: "Arm - Upper left",
      }),
      null,
      now,
    );
    expect(v.takenDate).toBe("2026-10-04");
    expect(v.pain).toBe("0");
    expect(v.strengthMg).toBe("7.5");
    expect(toTakenAtIso(v.takenDate, v.takenTime)).toMatch(/Z$/);
  });
  it("defaults a logged scheduled dose to now", () => {
    expect(initialDoseForm(dose(), null, now).takenDate).toBe("2026-10-05");
  });
});

describe("chat model", () => {
  const msg = (over: Partial<Message> = {}): Message => ({
    id: "m1",
    direction: "out",
    sender_role: "doctor",
    sender_display_name: "Dr. Lee",
    body: "Hello",
    delivery_status: "delivered",
    attachments: [],
    created_at: "2026-10-05T10:00:00Z",
    ...over,
  });
  const convo = (over: Partial<Conversation> = {}): Conversation => ({
    id: "c1",
    kind: "doctor",
    state: "awaiting_patient",
    last_message_at: null,
    unread_for_patient: false,
    messages: [],
    created_at: "",
    ...over,
  });
  it("labels roles", () => {
    expect(roleLabel("doctor")).toBe("Doctor");
    expect(roleLabel("customer_success")).toBe("Customer Success Manager");
    expect(roleLabel("support")).toBe("Support");
    expect(roleLabel("patient")).toBe("You");
  });
  it("orders threads doctor first and counts unread", () => {
    const list = [
      convo({ id: "s", kind: "support", unread_for_patient: true }),
      convo({ id: "d" }),
    ];
    expect(sortThreads(list).map((c) => c.id)).toEqual(["d", "s"]);
    expect(unreadCount(list)).toBe(1);
  });
  it("validates message bodies", () => {
    expect(validateBody("   ").ok).toBe(false);
    expect(validateBody("x".repeat(5001)).ok).toBe(false);
    expect(validateBody("  hi  ")).toEqual({ ok: true, body: "hi" });
  });
  it("validates attachments", () => {
    expect(
      validateAttachment({
        name: "a.exe",
        type: "application/x-msdownload",
        size: 10,
      }),
    ).toBeTruthy();
    expect(
      validateAttachment({ name: "a.png", type: "image/png", size: 0 }),
    ).toBeTruthy();
    expect(
      validateAttachment({
        name: "a.png",
        type: "image/png",
        size: 11 * 1024 * 1024,
      }),
    ).toBeTruthy();
    expect(
      validateAttachment({
        name: "a.pdf",
        type: "application/pdf",
        size: 1000,
      }),
    ).toBeNull();
  });
  it("puts pending messages after server messages in time order", () => {
    const items = buildThreadItems(
      [
        msg({ id: "late", created_at: "2026-10-05T12:00:00Z" }),
        msg({ id: "early" }),
      ],
      [{ localId: "l1", body: "x", createdAt: "", status: "failed" }],
    );
    expect(items.map((i) => i.key)).toEqual(["early", "late", "l1"]);
  });
  it("previews the last message", () => {
    expect(previewOf(convo())).toBe("No messages yet");
    expect(
      previewOf(convo({ messages: [msg({ body: "a".repeat(120) })] })),
    ).toHaveLength(80);
  });
});

describe("account model", () => {
  it("parses the tab search param defensively", () => {
    expect(parseAccountTab("phi")).toBe("phi");
    expect(parseAccountTab("nope")).toBe("profile");
    expect(parseAccountTab(undefined)).toBe("profile");
    expect(ACCOUNT_TABS).toHaveLength(3);
  });
  it("validates names and phones", () => {
    expect(validateName("", "First name")).toBeTruthy();
    expect(validateName("A\u0000B", "First name")).toBeTruthy();
    expect(validateName("Matt", "First name")).toBeNull();
    expect(validatePhone("")).toBeNull();
    expect(validatePhone("(719) 510-6341")).toBeNull();
    expect(validatePhone("12345")).toBeTruthy();
    expect(validatePhone("555-1234; rm -rf /")).toBeTruthy();
    expect(formatPhone("7195106341")).toBe("(719) 510-6341");
  });
  it("validates addresses", () => {
    const ok = {
      ...emptyAddress(),
      line1: "1 Main St",
      city: "Houston",
      state: "tx",
      zip_code: "77002",
    };
    expect(validateAddress(ok)).toEqual({});
    expect(normalizeAddress(ok).state).toBe("TX");
    const bad = validateAddress({
      ...ok,
      state: "ZZ",
      zip_code: "ABCDE",
      line1: "",
    });
    expect(bad.state && bad.zip_code && bad.line1).toBeTruthy();
    expect(
      validateAddress({ ...ok, line1: "../../etc/passwd\u0007" }).line1,
    ).toBeTruthy();
  });
  it("detects expired cards", () => {
    const now = new Date(2026, 9, 5);
    expect(isCardExpired({ exp_month: 9, exp_year: 2026 }, now)).toBe(true);
    expect(isCardExpired({ exp_month: 10, exp_year: 2026 }, now)).toBe(false);
  });
  it("finds open data requests and names the export file", () => {
    const list = [
      {
        id: "1",
        kind: "deletion" as const,
        status: "completed" as const,
        completed_at: null,
        created_at: "",
      },
      {
        id: "2",
        kind: "deletion" as const,
        status: "in_review" as const,
        completed_at: null,
        created_at: "",
      },
    ];
    expect(openDataRequest(list, "deletion")?.id).toBe("2");
    expect(openDataRequest(list, "export")).toBeNull();
    expect(exportFilename(new Date(2026, 9, 5))).toBe(
      "beema-health-data-2026-10-05.json",
    );
  });
});

import { describe, expect, it } from "vitest";
import { snapshotRowsForStep } from "@/lib/intake-submission-display";
import type { IntakeSubmissionSnapshot } from "@/lib/types/mvp";

const sampleSnapshot: IntakeSubmissionSnapshot = {
  meta: {
    version: 1,
    submitted_at: "2026-06-18T12:00:00.000Z",
    intake_id: "intake-1",
    intake_status: "submitted",
  },
  account: {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    phone: "3035550100",
    dob: "1990-01-01",
    state: "Arizona",
  },
  account_summary: {
    first_name: "Jane",
    last_name: "Doe",
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone: "3035550100",
    dob: "1990-01-01",
    state: "Arizona",
    height_ft: 5,
    height_in: 8,
    weight_lbs: "170",
    goal_weight_lbs: "150",
    bmi: 25.8,
  },
  eligibility_screening: {},
  identity_contact: {
    preferred: "Janie",
    address: "123 Main St",
    city: "Denver",
    county: "Denver",
    zip: "80202",
    emergency_name: "John Doe",
    emergency_phone: "3035550101",
    address_verified: "true",
  },
  clinical: {
    identity: {},
    body_metrics: {
      highest_weight: "200",
      lowest_weight: "150",
      goals: ["Weight loss"],
    },
    weight_history: { methods: ["Diet changes"], prior_meds: [] },
    medical_conditions: { type2_diabetes: true },
    family_history: { diabetes: true },
    medications: { answers: { taking_prescription: false }, list: [] },
    allergies: { answers: { has_med: false }, list: [] },
    pregnancy: {},
    lifestyle: { sleep: "7" },
    labs: { recent_labs: true },
    medication_preferences: { self_inject: true },
    safety_acknowledgments: { agreed: true },
  },
  consent: {
    typed_signature: "Jane Doe",
    signed_at: "2026-06-18T12:00:00.000Z",
    telehealth_consent: true,
    privacy_acknowledgment: true,
  },
};

describe("intake-submission-display", () => {
  it("includes account and identity rows for step 0", () => {
    const rows = snapshotRowsForStep(0, sampleSnapshot);
    expect(rows.some((r) => r.label === "Name" && r.value === "Jane Doe")).toBe(
      true,
    );
    expect(rows.some((r) => r.label === "Emergency contact name")).toBe(true);
  });

  it("includes clinical sections for later steps", () => {
    const bodyRows = snapshotRowsForStep(1, sampleSnapshot);
    expect(bodyRows.some((r) => r.label.includes("Highest adult weight"))).toBe(
      true,
    );
    const conditionRows = snapshotRowsForStep(3, sampleSnapshot);
    expect(conditionRows.some((r) => r.value === "Yes")).toBe(true);
  });

  it("falls back to clinical.identity for contact fields", () => {
    const snapshot: IntakeSubmissionSnapshot = {
      ...sampleSnapshot,
      identity_contact: {},
      clinical: {
        ...sampleSnapshot.clinical,
        identity: {
          preferred: "Janie",
          address: "456 Oak Ave",
          city: "Boulder",
          county: "Boulder",
          zip: "80301",
          emergency_name: "Sam Doe",
          emergency_phone: "3035550199",
        },
      },
    };
    const rows = snapshotRowsForStep(0, snapshot);
    expect(
      rows.some(
        (r) => r.label === "Preferred first name" && r.value === "Janie",
      ),
    ).toBe(true);
    expect(
      rows.some(
        (r) => r.label === "Home address" && r.value.includes("456 Oak"),
      ),
    ).toBe(true);
  });

  it("formats lifestyle dropdown labels for step 8", () => {
    const rows = snapshotRowsForStep(8, {
      ...sampleSnapshot,
      clinical: {
        ...sampleSnapshot.clinical,
        lifestyle: {
          diet: "balanced",
          smoke: "1_3_week",
          struggle: "all",
          drugs: "yes",
          drugs_detail: "Cannabis",
        },
      },
    });
    expect(
      rows.some(
        (r) =>
          r.label === "How would you describe your diet?" &&
          r.value.includes("Balanced"),
      ),
    ).toBe(true);
    expect(
      rows.some(
        (r) =>
          r.label === "Type of recreational drug use" && r.value === "Cannabis",
      ),
    ).toBe(true);
  });
});

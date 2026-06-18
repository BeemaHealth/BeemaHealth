import { describe, expect, it } from "vitest";
import { getIntakeStepError, isIntakeStepComplete, emptyIntakeData, normalizeIntake } from "@/lib/intake-steps";
import type { MedicalIntake } from "@/lib/types/mvp";
import { SQL_INJECTION, STRICT_FIELD_ATTACKS } from "./fixtures/malicious-payloads";
import { validEligibility, validIntake } from "./helpers/test-data";

const STEP_COUNT = 12;

describe("intake-steps validation", () => {
  describe("happy paths", () => {
    it.each(Array.from({ length: STEP_COUNT }, (_, i) => i))("step %i passes with validIntake()", (step) => {
      expect(getIntakeStepError(step, validIntake(), validEligibility())).toBeNull();
    });
  });

  describe("step 0 identity", () => {
    it("requires verified address", () => {
      const data = validIntake({
        identity: {
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          address_verified: "false",
          emergency_name: "John",
          emergency_phone: "3035550100",
        },
      });
      expect(getIntakeStepError(0, data)).not.toBeNull();
    });

    it.each(STRICT_FIELD_ATTACKS)("rejects malicious emergency phone %j", (payload) => {
      const data = validIntake({
        identity: {
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          address_verified: "true",
          emergency_name: "John",
          emergency_phone: payload,
        },
      });
      expect(getIntakeStepError(0, data)).not.toBeNull();
    });
  });

  describe("step 1 body metrics", () => {
    it("requires goals and valid weights", () => {
      expect(
        getIntakeStepError(
          1,
          validIntake({ body_metrics: { highest_weight: "210", lowest_weight: "165", goals: [] } }),
          { weight_lbs: 190 },
        ),
      ).not.toBeNull();
    });

    it.each(SQL_INJECTION)("rejects injection in highest_weight %j", (payload) => {
      expect(
        getIntakeStepError(
          1,
          validIntake({ body_metrics: { highest_weight: payload, lowest_weight: "165", goals: ["Weight loss"] } }),
          { weight_lbs: 190 },
        ),
      ).not.toBeNull();
    });
  });

  describe("step 2 weight history", () => {
    it("requires at least one method", () => {
      const data = validIntake({ weight_history: { methods: [], prior_meds: [], prior_details: {} } });
      expect(getIntakeStepError(2, data)).not.toBeNull();
    });

    it("requires per-med details when prior med selected", () => {
      const data = validIntake({
        weight_history: {
          methods: ["Diet changes"],
          prior_meds: ["Semaglutide"],
          prior_details: { Semaglutide: { dose: "", started: "", stopped: "", stop_reason: "", side_effects: "" } },
        },
      });
      expect(getIntakeStepError(2, data)).toMatch(/dose for Semaglutide/);
    });

    it("accepts SQL literal in optional free-text stop_reason once required fields filled", () => {
      const payload = SQL_INJECTION[0];
      const data = validIntake({
        weight_history: {
          methods: ["Diet changes"],
          prior_meds: ["Semaglutide"],
          prior_details: {
            Semaglutide: {
              dose: "0.5 mg",
              started: "2024",
              stopped: "2025",
              stop_reason: payload,
              side_effects: "",
            },
          },
        },
      });
      expect(getIntakeStepError(2, data)).toBeNull();
    });
  });

  describe("step 5 medications", () => {
    it("requires medication list when taking Rx", () => {
      const data = validIntake({
        medications: {
          answers: {
            taking_prescription: true,
            taking_otc: false,
            supplements: false,
            insulin: false,
            sulfonylurea: false,
            bp_meds: false,
            psych_meds: false,
            opioids: false,
            weight_meds: false,
          },
          list: [],
        },
      });
      expect(getIntakeStepError(5, data)).toMatch(/Add at least one medication/);
    });
  });

  describe("step 6 allergies", () => {
    it("requires allergy rows when has_med true", () => {
      const data = validIntake({
        allergies: {
          answers: { has_med: true, has_food: false },
          list: [],
        },
      });
      expect(getIntakeStepError(6, data)).toMatch(/Add at least one allergy/);
    });
  });

  describe("step 9 labs", () => {
    it.each(SQL_INJECTION)("rejects non-numeric lab injection %j", (payload) => {
      const data = validIntake({ labs: { bp: payload, recent_labs: false, willing: true } });
      expect(getIntakeStepError(9, data)).not.toBeNull();
    });
  });

  describe("step 10 medication preferences", () => {
    it("validates pharmacy phone when provided", () => {
      const data = validIntake({
        medication_preferences: {
          self_inject: true,
          shipping_preference: "Standard",
          cash_pay_ok: true,
          pharmacy_phone: "' OR 1=1--",
        },
      });
      expect(getIntakeStepError(10, data, validEligibility())).toMatch(/pharmacy phone/);
    });
  });

  describe("step 11 safety acknowledgments", () => {
    it("requires all checkboxes", () => {
      const acks = validIntake().safety_acknowledgments as Record<string, boolean>;
      const partial = { ...acks, accurate: false };
      const data = validIntake({ safety_acknowledgments: partial });
      expect(getIntakeStepError(11, data)).not.toBeNull();
    });
  });

  describe("normalizeIntake", () => {
    it("does not crash on malicious nested prior_details", () => {
      const raw = {
        ...emptyIntakeData(),
        weight_history: {
          methods: ["Diet changes"],
          prior_meds: ["Semaglutide"],
          prior_details: { Semaglutide: { dose: SQL_INJECTION[0], stopped: "2024", stop_reason: "side effects" } },
        },
      };
      const normalized = normalizeIntake({
        id: "x",
        user_id: "y",
        status: "draft",
        created_at: "",
        updated_at: "",
        submitted_at: null,
        ...raw,
      } as MedicalIntake);
      expect(normalized.weight_history.prior_details.Semaglutide.dose).toBe(SQL_INJECTION[0]);
    });
  });

  describe("isIntakeStepComplete", () => {
    it("matches getIntakeStepError", () => {
      const bad = validIntake({ pregnancy: { understand: false } });
      expect(isIntakeStepComplete(7, bad)).toBe(false);
    });
  });
});

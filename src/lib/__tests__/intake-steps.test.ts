import { describe, expect, it } from "vitest";
import {
  getIntakeStepError,
  isIntakeStepComplete,
  emptyIntakeData,
  normalizeIntake,
  type PriorMedDetails,
} from "@/lib/intake-steps";
import type { MedicalIntake } from "@/lib/types/mvp";
import {
  SQL_INJECTION,
  STRICT_FIELD_ATTACKS,
} from "./fixtures/malicious-payloads";
import { validEligibility, validIntake } from "./helpers/test-data";
import { VERIFIABLE_PARSED_ADDRESSES } from "./fixtures/address-fixtures";

const STEP_COUNT = 12;

type EligibilitySlice = ReturnType<typeof validEligibility>;

/** Error strings that must never appear while a step is merely incomplete. */
const FORBIDDEN_INCOMPLETE_FOOTER_COPY = [
  /Enter a valid/i,
  /Answer every/i,
  /Add at least/i,
  /Enter the /i,
  /Enter when you/i,
  /Enter why you/i,
  /must be between/i,
  /cannot be higher/i,
  /should be at least/i,
  /blood pressure/i,
  /valid number for/i,
  /member ID/i,
  /insurance provider/i,
];

describe("intake-steps validation", () => {
  describe("happy paths", () => {
    it.each(Array.from({ length: STEP_COUNT }, (_, i) => i))(
      "step %i passes with validIntake()",
      (step) => {
        expect(
          getIntakeStepError(step, validIntake(), validEligibility()),
        ).toBeNull();
      },
    );
  });

  describe("incomplete steps block Continue without footer copy", () => {
    const femaleEligibility = validEligibility({
      sex_assigned_at_birth: "female",
      gender_identity: "female",
    });
    const noTreatmentEligibility = validEligibility({
      treatment_interest: undefined,
    });

    const cases: {
      label: string;
      step: number;
      data: MedicalIntake;
      eligibility?: EligibilitySlice;
    }[] = [
      {
        label: "step 0 empty identity",
        step: 0,
        data: validIntake({
          identity: {
            address: "",
            city: "",
            zip: "",
            county: "",
            address_verified: "",
            emergency_name: "",
            emergency_phone: "",
          },
        }),
      },
      {
        label: "step 0 unverified address",
        step: 0,
        data: validIntake({
          identity: {
            address: "123 Main St",
            city: "Denver",
            zip: "80202",
            county: "Denver County",
            address_verified: "false",
            emergency_name: "John",
            emergency_phone: "3035550100",
          },
        }),
      },
      {
        label: "step 1 empty weight history",
        step: 1,
        data: validIntake({
          body_metrics: {
            highest_weight: "",
            lowest_weight: "",
            goals: [],
          },
        }),
        eligibility: { ...validEligibility(), weight_lbs: 190 },
      },
      {
        label: "step 1 empty goals only",
        step: 1,
        data: validIntake({
          body_metrics: {
            highest_weight: "210",
            lowest_weight: "165",
            goals: [],
          },
        }),
        eligibility: { ...validEligibility(), weight_lbs: 190 },
      },
      {
        label: "step 2 no methods selected",
        step: 2,
        data: validIntake({
          weight_history: { methods: [], prior_meds: [], prior_details: {} },
        }),
      },
      {
        label: "step 2 prior med details incomplete",
        step: 2,
        data: validIntake({
          weight_history: {
            methods: ["Diet changes"],
            prior_meds: ["Semaglutide"],
            prior_details: {
              Semaglutide: {
                dose: "",
                started: "",
                stopped: "",
                stop_reason: "",
                side_effects: "",
              },
            },
          },
        }),
      },
      {
        label: "step 3 unanswered medical conditions",
        step: 3,
        data: validIntake({ medical_conditions: {} }),
      },
      {
        label: "step 4 unanswered family history",
        step: 4,
        data: validIntake({ family_history: {} }),
      },
      {
        label: "step 5 unanswered medication questions",
        step: 5,
        data: validIntake({ medications: { answers: {}, list: [] } }),
      },
      {
        label: "step 5 missing medication list after yes",
        step: 5,
        data: validIntake({
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
        }),
      },
      {
        label: "step 5 incomplete medication row",
        step: 5,
        data: validIntake({
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
            list: [{ name: "", dose: "", frequency: "", reason: "" }],
          },
        }),
      },
      {
        label: "step 6 unanswered allergy questions",
        step: 6,
        data: validIntake({ allergies: { answers: {}, list: [] } }),
      },
      {
        label: "step 6 missing allergy list after yes",
        step: 6,
        data: validIntake({
          allergies: {
            answers: { has_med: true, has_food: false },
            list: [],
          },
        }),
      },
      {
        label: "step 6 incomplete allergy row",
        step: 6,
        data: validIntake({
          allergies: {
            answers: { has_med: true, has_food: false },
            list: [{ allergy: "", reaction: "", severity: "" }],
          },
        }),
      },
      {
        label: "step 7 unchecked pregnancy acknowledgment",
        step: 7,
        data: validIntake({ pregnancy: {} }),
        eligibility: femaleEligibility,
      },
      {
        label: "step 8 empty lifestyle fields",
        step: 8,
        data: validIntake({ lifestyle: {} }),
      },
      {
        label: "step 8 drugs detail missing after yes",
        step: 8,
        data: validIntake({
          lifestyle: {
            exercise_days: "2",
            exercise_type: "Walking",
            diet: "balanced",
            smoke: "no",
            alcohol: "no",
            drugs: "yes",
            drugs_detail: "",
            sleep: "7_8",
            binge: "never",
            night_eating: "no",
            struggle: "none",
          },
        }),
      },
      {
        label: "step 9 unanswered lab yes/no",
        step: 9,
        data: validIntake({
          labs: { bp: "", a1c: "", glucose: "", cholesterol: "" },
        }),
      },
      {
        label: "step 9 invalid optional labs before yes/no answered",
        step: 9,
        data: validIntake({
          labs: {
            bp: "not-bp",
            a1c: "abc",
            glucose: "xyz",
            cholesterol: "bad",
          },
        }),
      },
      {
        label: "step 10 missing treatment preference",
        step: 10,
        data: validIntake({
          medication_preferences: {
            self_inject: true,
            shipping_preference: "shipping",
            cash_pay_ok: true,
          },
        }),
        eligibility: noTreatmentEligibility,
      },
      {
        label: "step 10 unanswered self-inject",
        step: 10,
        data: validIntake({
          medication_preferences: {
            shipping_preference: "shipping",
            cash_pay_ok: true,
          },
        }),
      },
      {
        label: "step 10 unanswered cash pay",
        step: 10,
        data: validIntake({
          medication_preferences: {
            self_inject: true,
            shipping_preference: "shipping",
          },
        }),
      },
      {
        label: "step 10 non-shipping preference",
        step: 10,
        data: (() => {
          const data = validIntake();
          data.medication_preferences = {
            ...(data.medication_preferences as Record<
              string,
              string | boolean
            >),
            shipping_preference: "pickup",
          };
          return data;
        })(),
      },
      {
        label: "step 10 incomplete alternate shipping",
        step: 10,
        data: validIntake({
          medication_preferences: {
            self_inject: true,
            shipping_preference: "shipping",
            cash_pay_ok: true,
            use_different_shipping_address: true,
            shipping_address: "456 Oak Ave",
            shipping_city: "Denver",
            shipping_zip: "80203",
            shipping_county: "Denver County",
          },
        }),
      },
      {
        label: "step 11 unchecked safety acknowledgment",
        step: 11,
        data: validIntake({ safety_acknowledgments: { agreed: false } }),
      },
      {
        label: "step 11 missing safety acknowledgment",
        step: 11,
        data: validIntake({ safety_acknowledgments: {} }),
      },
    ];

    it.each(cases)("$label", ({ step, data, eligibility }) => {
      const err = getIntakeStepError(
        step,
        data,
        eligibility ?? validEligibility(),
      );
      expect(err).toBe("");
      for (const pattern of FORBIDDEN_INCOMPLETE_FOOTER_COPY) {
        expect(err).not.toMatch(pattern);
      }
      expect(
        isIntakeStepComplete(step, data, eligibility ?? validEligibility()),
      ).toBe(false);
    });
  });

  describe("invalid filled input still returns footer copy", () => {
    it("step 0 shows phone format error when emergency phone is filled but invalid", () => {
      const data = validIntake({
        identity: {
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          county: "Denver County",
          address_verified: "true",
          emergency_name: "John",
          emergency_phone: "12345",
        },
      });
      expect(getIntakeStepError(0, data)).toMatch(/emergency contact phone/i);
    });

    it("step 1 shows weight format error when highest weight is filled but invalid", () => {
      const data = validIntake({
        body_metrics: {
          highest_weight: "abc",
          lowest_weight: "165",
          goals: ["Weight loss"],
        },
      });
      expect(getIntakeStepError(1, data, { weight_lbs: 190 })).toMatch(
        /valid highest weight/i,
      );
    });

    it("step 9 shows lab format error after yes/no answered", () => {
      const data = validIntake({
        labs: { a1c: "not-a-number", recent_labs: false, willing: true },
      });
      expect(getIntakeStepError(9, data)).toMatch(/valid number for A1C/i);
    });

    it("step 10 shows member ID error when filled but invalid", () => {
      const data = validIntake({
        medication_preferences: {
          self_inject: true,
          shipping_preference: "shipping",
          cash_pay_ok: true,
          member_id: "' OR 1=1--",
        },
      });
      expect(getIntakeStepError(10, data, validEligibility())).toMatch(
        /member ID/i,
      );
    });
  });

  describe("step 0 identity", () => {
    it("blocks progress without a user-facing message when required fields are empty", () => {
      const data = validIntake({
        identity: {
          address: "",
          city: "",
          zip: "",
          county: "",
          address_verified: "",
          emergency_name: "",
          emergency_phone: "",
        },
      });
      expect(getIntakeStepError(0, data)).toBe("");
      expect(isIntakeStepComplete(0, data)).toBe(false);
    });

    it("blocks progress without a user-facing message when address is unverified", () => {
      const data = validIntake({
        identity: {
          address: "123 Main St",
          city: "Denver",
          zip: "80202",
          county: "Denver County",
          address_verified: "false",
          emergency_name: "John",
          emergency_phone: "3035550100",
        },
      });
      expect(getIntakeStepError(0, data)).toBe("");
      expect(isIntakeStepComplete(0, data)).toBe(false);
    });

    it.each(STRICT_FIELD_ATTACKS)(
      "rejects malicious emergency phone %j",
      (payload) => {
        const data = validIntake({
          identity: {
            address: "123 Main St",
            city: "Denver",
            zip: "80202",
            county: "Denver County",
            address_verified: "true",
            emergency_name: "John",
            emergency_phone: payload,
          },
        });
        expect(getIntakeStepError(0, data)).not.toBeNull();
      },
    );

    it.each(VERIFIABLE_PARSED_ADDRESSES.map((c) => [c.label, c.parsed]))(
      "passes with verified deliverable address: %s",
      (_label, parsed) => {
        const data = validIntake({
          identity: {
            address: parsed.address,
            city: parsed.city,
            zip: parsed.zip,
            county: parsed.county,
            address_verified: "true",
            emergency_name: "John",
            emergency_phone: "3035550100",
          },
        });
        expect(getIntakeStepError(0, data)).toBeNull();
        expect(isIntakeStepComplete(0, data)).toBe(true);
      },
    );

    it.each([
      ["missing street number", { address: "Main St" }],
      ["incomplete street name", { address: "2510 sum" }],
    ] as const)(
      "blocks verified identity with invalid street: %s",
      (_label, overrides) => {
        const data = validIntake({
          identity: {
            ...{
              address: "123 Main St",
              city: "Denver",
              zip: "80202",
              county: "Denver County",
              address_verified: "true",
              emergency_name: "John",
              emergency_phone: "3035550100",
            },
            ...overrides,
          },
        });
        expect(getIntakeStepError(0, data)).toBe("");
        expect(isIntakeStepComplete(0, data)).toBe(false);
      },
    );

    it.each(STRICT_FIELD_ATTACKS)(
      "rejects malicious identity address %j",
      (payload) => {
        const data = validIntake({
          identity: {
            address: payload,
            city: "Denver",
            zip: "80202",
            county: "Denver County",
            address_verified: "true",
            emergency_name: "John",
            emergency_phone: "3035550100",
          },
        });
        expect(getIntakeStepError(0, data)).not.toBeNull();
        expect(isIntakeStepComplete(0, data)).toBe(false);
      },
    );

    it.each(STRICT_FIELD_ATTACKS.filter((p) => p !== "admin'--"))(
      "rejects malicious identity city %j",
      (payload) => {
        const data = validIntake({
          identity: {
            address: "123 Main St",
            city: payload,
            zip: "80202",
            county: "Denver County",
            address_verified: "true",
            emergency_name: "John",
            emergency_phone: "3035550100",
          },
        });
        expect(getIntakeStepError(0, data)).not.toBeNull();
        expect(isIntakeStepComplete(0, data)).toBe(false);
      },
    );

    it.each(STRICT_FIELD_ATTACKS)(
      "rejects malicious identity zip %j",
      (payload) => {
        const data = validIntake({
          identity: {
            address: "123 Main St",
            city: "Denver",
            zip: payload,
            county: "Denver County",
            address_verified: "true",
            emergency_name: "John",
            emergency_phone: "3035550100",
          },
        });
        expect(getIntakeStepError(0, data)).not.toBeNull();
        expect(isIntakeStepComplete(0, data)).toBe(false);
      },
    );

    it.each(STRICT_FIELD_ATTACKS.filter((p) => p !== "admin'--"))(
      "rejects malicious identity county %j",
      (payload) => {
        const data = validIntake({
          identity: {
            address: "123 Main St",
            city: "Denver",
            zip: "80202",
            county: payload,
            address_verified: "true",
            emergency_name: "John",
            emergency_phone: "3035550100",
          },
        });
        expect(getIntakeStepError(0, data)).not.toBeNull();
        expect(isIntakeStepComplete(0, data)).toBe(false);
      },
    );
  });

  describe("step 1 body metrics", () => {
    it("blocks progress without a user-facing message when weight fields are empty", () => {
      const data = validIntake({
        body_metrics: {
          highest_weight: "",
          lowest_weight: "",
          goals: [],
        },
      });
      const err = getIntakeStepError(1, data, { weight_lbs: 190 });
      expect(err).toBe("");
      expect(err).not.toMatch(/valid highest weight/i);
      expect(isIntakeStepComplete(1, data, { weight_lbs: 190 })).toBe(false);
    });

    it("blocks progress without a user-facing message when only highest weight is empty", () => {
      const data = validIntake({
        body_metrics: {
          highest_weight: "",
          lowest_weight: "165",
          goals: ["Weight loss"],
        },
      });
      const err = getIntakeStepError(1, data, { weight_lbs: 190 });
      expect(err).toBe("");
      expect(err).not.toMatch(/valid highest weight/i);
      expect(isIntakeStepComplete(1, data, { weight_lbs: 190 })).toBe(false);
    });

    it("blocks progress without a user-facing message when goals are empty", () => {
      const data = validIntake({
        body_metrics: {
          highest_weight: "210",
          lowest_weight: "165",
          goals: [],
        },
      });
      expect(getIntakeStepError(1, data, { weight_lbs: 190 })).toBe("");
      expect(isIntakeStepComplete(1, data, { weight_lbs: 190 })).toBe(false);
    });

    it("shows a format error when highest weight is filled but invalid", () => {
      const data = validIntake({
        body_metrics: {
          highest_weight: "abc",
          lowest_weight: "165",
          goals: ["Weight loss"],
        },
      });
      expect(getIntakeStepError(1, data, { weight_lbs: 190 })).toMatch(
        /valid highest weight/i,
      );
    });

    it.each(SQL_INJECTION)(
      "rejects injection in highest_weight %j",
      (payload) => {
        expect(
          getIntakeStepError(
            1,
            validIntake({
              body_metrics: {
                highest_weight: payload,
                lowest_weight: "165",
                goals: ["Weight loss"],
              },
            }),
            { weight_lbs: 190 },
          ),
        ).not.toBeNull();
      },
    );
  });

  describe("step 2 weight history", () => {
    it("blocks progress without a user-facing message when no methods selected", () => {
      const data = validIntake({
        weight_history: { methods: [], prior_meds: [], prior_details: {} },
      });
      expect(getIntakeStepError(2, data)).toBe("");
      expect(isIntakeStepComplete(2, data)).toBe(false);
    });

    it("blocks progress without a user-facing message when prior med details are incomplete", () => {
      const data = validIntake({
        weight_history: {
          methods: ["Diet changes"],
          prior_meds: ["Semaglutide"],
          prior_details: {
            Semaglutide: {
              dose: "",
              started: "",
              stopped: "",
              stop_reason: "",
              side_effects: "",
            },
          },
        },
      });
      const err = getIntakeStepError(2, data);
      expect(err).toBe("");
      expect(err).not.toMatch(/dose for Semaglutide/i);
      expect(isIntakeStepComplete(2, data)).toBe(false);
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

  describe("step 3 medical conditions", () => {
    it("blocks progress without a user-facing message when questions are unanswered", () => {
      const data = validIntake({ medical_conditions: {} });
      const err = getIntakeStepError(3, data);
      expect(err).toBe("");
      expect(err).not.toMatch(/medical condition/i);
      expect(isIntakeStepComplete(3, data)).toBe(false);
    });
  });

  describe("step 4 family history", () => {
    it("blocks progress without a footer message when questions are unanswered", () => {
      const data = validIntake({ family_history: {} });
      expect(getIntakeStepError(4, data)).toBe("");
      expect(isIntakeStepComplete(4, data)).toBe(false);
    });
  });

  describe("step 5 medications", () => {
    it("blocks progress without a footer message when questions are unanswered", () => {
      const data = validIntake({
        medications: { answers: {}, list: [] },
      });
      expect(getIntakeStepError(5, data)).toBe("");
      expect(isIntakeStepComplete(5, data)).toBe(false);
    });

    it("blocks progress without a user-facing message when medication list is missing", () => {
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
      const err = getIntakeStepError(5, data);
      expect(err).toBe("");
      expect(err).not.toMatch(/Add at least one medication/i);
      expect(isIntakeStepComplete(5, data)).toBe(false);
    });
  });

  describe("step 6 allergies", () => {
    it("blocks progress without a footer message when questions are unanswered", () => {
      const data = validIntake({
        allergies: { answers: {}, list: [] },
      });
      expect(getIntakeStepError(6, data)).toBe("");
      expect(isIntakeStepComplete(6, data)).toBe(false);
    });

    it("blocks progress without a user-facing message when allergy list is missing", () => {
      const data = validIntake({
        allergies: {
          answers: { has_med: true, has_food: false },
          list: [],
        },
      });
      const err = getIntakeStepError(6, data);
      expect(err).toBe("");
      expect(err).not.toMatch(/Add at least one allergy/i);
      expect(isIntakeStepComplete(6, data)).toBe(false);
    });
  });

  describe("step 7 pregnancy", () => {
    it("auto-completes when reproductive questions do not apply", () => {
      const eligibility = validEligibility({
        sex_assigned_at_birth: "male",
        gender_identity: "male",
      });
      const data = validIntake({ pregnancy: {} });
      expect(getIntakeStepError(7, data, eligibility)).toBeNull();
      expect(isIntakeStepComplete(7, data, eligibility)).toBe(true);
    });

    it("auto-completes for male at birth when gender identity was never stored", () => {
      const eligibility = validEligibility({
        sex_assigned_at_birth: "male",
        gender_identity: "",
      });
      const data = validIntake({ pregnancy: {} });
      expect(getIntakeStepError(7, data, eligibility)).toBeNull();
      expect(isIntakeStepComplete(7, data, eligibility)).toBe(true);
    });

    it("blocks progress without a footer message when acknowledgment is unchecked", () => {
      const data = validIntake({ pregnancy: { understand: false } });
      expect(getIntakeStepError(7, data, validEligibility())).toBe("");
      expect(isIntakeStepComplete(7, data, validEligibility())).toBe(false);
    });

    it("requires acknowledgment for male at birth and female identity", () => {
      const eligibility = validEligibility({
        sex_assigned_at_birth: "male",
        gender_identity: "female",
      });
      const data = validIntake({ pregnancy: {} });
      expect(getIntakeStepError(7, data, eligibility)).toBe("");
      expect(isIntakeStepComplete(7, data, eligibility)).toBe(false);
    });
  });

  describe("step 8 lifestyle", () => {
    it("blocks progress without a footer message when fields are empty", () => {
      const data = validIntake({ lifestyle: {} });
      expect(getIntakeStepError(8, data)).toBe("");
      expect(isIntakeStepComplete(8, data)).toBe(false);
    });
  });

  describe("step 9 labs", () => {
    it("blocks progress without a footer message when yes/no questions are unanswered", () => {
      const data = validIntake({
        labs: { bp: "", a1c: "", glucose: "", cholesterol: "" },
      });
      expect(getIntakeStepError(9, data)).toBe("");
      expect(isIntakeStepComplete(9, data)).toBe(false);
    });

    it.each(SQL_INJECTION)(
      "rejects non-numeric lab injection %j",
      (payload) => {
        const data = validIntake({
          labs: { a1c: payload, recent_labs: false, willing: true },
        });
        expect(getIntakeStepError(9, data)).not.toBeNull();
      },
    );

    it("accepts blood pressure as systolic/diastolic", () => {
      const data = validIntake({
        labs: { bp: "157/32", recent_labs: true, willing: true },
      });
      expect(getIntakeStepError(9, data)).toBeNull();
    });
  });

  describe("step 10 medication preferences", () => {
    it("blocks progress without a user-facing message when treatment preference is missing", () => {
      const data = validIntake({
        medication_preferences: {
          self_inject: true,
          shipping_preference: "shipping",
          cash_pay_ok: true,
        },
      });
      expect(
        getIntakeStepError(
          10,
          data,
          validEligibility({ treatment_interest: undefined }),
        ),
      ).toBe("");
      expect(
        isIntakeStepComplete(
          10,
          data,
          validEligibility({ treatment_interest: undefined }),
        ),
      ).toBe(false);
    });

    it("blocks progress when shipping preference is not shipping", () => {
      const data = validIntake();
      data.medication_preferences = {
        ...(data.medication_preferences as Record<string, string | boolean>),
        shipping_preference: "pickup",
      };
      expect(getIntakeStepError(10, data, validEligibility())).toBe("");
      expect(isIntakeStepComplete(10, data, validEligibility())).toBe(false);
    });

    it("validates member ID when provided", () => {
      const data = validIntake({
        medication_preferences: {
          self_inject: true,
          shipping_preference: "shipping",
          cash_pay_ok: true,
          member_id: "' OR 1=1--",
        },
      });
      expect(getIntakeStepError(10, data, validEligibility())).toMatch(
        /member ID/,
      );
    });

    it("blocks progress when alternate shipping address is incomplete", () => {
      const data = validIntake({
        medication_preferences: {
          self_inject: true,
          shipping_preference: "shipping",
          cash_pay_ok: true,
          use_different_shipping_address: true,
          shipping_address: "456 Oak Ave",
          shipping_city: "Denver",
          shipping_zip: "80203",
          shipping_county: "Denver County",
        },
      });
      expect(getIntakeStepError(10, data, validEligibility())).toBe("");
      expect(isIntakeStepComplete(10, data, validEligibility())).toBe(false);
    });

    it("accepts a verified alternate shipping address", () => {
      const data = validIntake({
        medication_preferences: {
          self_inject: true,
          shipping_preference: "shipping",
          cash_pay_ok: true,
          use_different_shipping_address: true,
          shipping_address: "456 Oak Ave",
          shipping_city: "Denver",
          shipping_zip: "80203",
          shipping_county: "Denver County",
          shipping_address_verified: "true",
        },
      });
      expect(getIntakeStepError(10, data, validEligibility())).toBeNull();
    });
  });

  describe("step 11 review & agree", () => {
    it("blocks progress without a footer message when acknowledgment is unchecked", () => {
      const data = validIntake({
        safety_acknowledgments: { agreed: false },
      });
      expect(getIntakeStepError(11, data)).toBe("");
      expect(isIntakeStepComplete(11, data)).toBe(false);
    });

    it("accepts legacy all-true checkbox drafts", () => {
      const data = validIntake({
        safety_acknowledgments: {
          no_guarantee: true,
          provider_review: true,
          side_effects: true,
          emergency: true,
          compounded: true,
          accurate: true,
          telehealth: true,
          electronic: true,
          storage: true,
        },
      });
      expect(isIntakeStepComplete(11, data)).toBe(true);
    });

    it("normalizes legacy acknowledgments to single agreed flag", () => {
      const normalized = normalizeIntake({
        id: "x",
        user_id: "y",
        status: "draft",
        created_at: "",
        updated_at: "",
        submitted_at: null,
        ...emptyIntakeData(),
        safety_acknowledgments: {
          no_guarantee: true,
          provider_review: true,
          side_effects: true,
          emergency: true,
          compounded: true,
          accurate: true,
          telehealth: true,
          electronic: true,
          storage: true,
        },
      } as MedicalIntake);
      expect(normalized.safety_acknowledgments).toEqual({ agreed: true });
    });
  });

  describe("normalizeIntake", () => {
    it("migrates pickup drafts to shipping and clears pharmacy fields", () => {
      const normalized = normalizeIntake({
        id: "x",
        user_id: "y",
        status: "draft",
        created_at: "",
        updated_at: "",
        submitted_at: null,
        ...emptyIntakeData(),
        medication_preferences: {
          shipping_preference: "pickup",
          preferred_pharmacy: "CVS",
          pharmacy_phone: "(303) 555-0100",
          pharmacy_address: "123 Main St",
        },
      } as MedicalIntake);
      const prefs = normalized.medication_preferences as Record<
        string,
        unknown
      >;
      expect(prefs.shipping_preference).toBe("shipping");
      expect(prefs.preferred_pharmacy).toBeUndefined();
      expect(prefs.pharmacy_phone).toBeUndefined();
      expect(prefs.pharmacy_address).toBeUndefined();
    });

    it("does not crash on malicious nested prior_details", () => {
      const raw = {
        ...emptyIntakeData(),
        weight_history: {
          methods: ["Diet changes"],
          prior_meds: ["Semaglutide"],
          prior_details: {
            Semaglutide: {
              dose: SQL_INJECTION[0],
              stopped: "2024",
              stop_reason: "side effects",
            },
          },
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
      const priorDetails = normalized.weight_history.prior_details as Record<
        string,
        PriorMedDetails
      >;
      expect(priorDetails.Semaglutide.dose).toBe(SQL_INJECTION[0]);
    });
  });

  describe("isIntakeStepComplete", () => {
    it("matches getIntakeStepError", () => {
      const bad = validIntake({ pregnancy: { understand: false } });
      expect(isIntakeStepComplete(7, bad)).toBe(false);
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  CONTRAINDICATION_QUESTIONS,
  getQualifyStepError,
  isQualifyStepComplete,
  type QualifyFormSlice,
  type QualifyStepId,
} from "@/lib/qualify-steps";
import {
  KNOWN_NAME_FORMAT_PASSES,
  SQL_INJECTION,
  STRICT_FIELD_ATTACKS,
  XSS_PAYLOADS,
  maliciousEmails,
} from "./fixtures/malicious-payloads";
import { validAccountFields, validQualifySlice } from "./helpers/test-data";

const PRE_SIGNUP_STEPS: QualifyStepId[] = [
  "treatment_interest",
  "primary_goal",
  "treatment_priority",
  "weight_loss_goal",
  "state_consent",
  "dob",
  "body_metrics",
  "sex_assigned_at_birth",
  "contraindications",
  "review",
];

describe("qualify-steps validation", () => {
  describe("happy paths", () => {
    it.each(PRE_SIGNUP_STEPS.filter((s) => s !== "review"))(
      "step %s passes with valid data",
      (step) => {
        expect(getQualifyStepError(step, validQualifySlice())).toBeNull();
      },
    );

    it("account step passes with valid account fields", () => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields(),
        ),
      ).toBeNull();
    });
  });

  describe("required field failures", () => {
    const choiceStepsWithoutMessage: Array<
      [QualifyStepId, Partial<QualifyFormSlice>]
    > = [
      ["treatment_interest", { treatmentInterest: "" }],
      ["primary_goal", { primaryGoal: "" }],
      ["treatment_priority", { treatmentPriority: "" }],
      ["weight_loss_goal", { targetWeightLossRange: "" }],
      ["sex_assigned_at_birth", { sexAssignedAtBirth: "" }],
    ];

    it.each(choiceStepsWithoutMessage)(
      "step %s blocks progress without a user-facing message",
      (step, overrides) => {
        const data = validQualifySlice(overrides);
        expect(getQualifyStepError(step, data)).toBe("");
        expect(isQualifyStepComplete(step, data)).toBe(false);
      },
    );

    it("state and consents required", () => {
      expect(
        getQualifyStepError("state_consent", validQualifySlice({ state: "" })),
      ).not.toBeNull();
      expect(
        getQualifyStepError(
          "state_consent",
          validQualifySlice({
            consents: { terms: false, privacy: true, telehealth: true },
          }),
        ),
      ).not.toBeNull();
    });

    it("rejects under-18 DOB", () => {
      expect(
        getQualifyStepError("dob", validQualifySlice({ dob: "2015-01-01" })),
      ).toMatch(/18/);
    });

    it("body_metrics validates height inches", () => {
      expect(
        getQualifyStepError(
          "body_metrics",
          validQualifySlice({ heightIn: "" }),
        ),
      ).not.toBeNull();
    });

    it("contraindications require all answers", () => {
      const partialSafety = Object.fromEntries(
        CONTRAINDICATION_QUESTIONS.slice(0, -1).map((q) => [q.key, false]),
      ) as ReturnType<typeof validQualifySlice>["safety"];
      expect(
        getQualifyStepError(
          "contraindications",
          validQualifySlice({ safety: partialSafety }),
        ),
      ).not.toBeNull();
    });
  });

  describe("account step injection resistance", () => {
    it.each(
      STRICT_FIELD_ATTACKS.filter(
        (p) =>
          !KNOWN_NAME_FORMAT_PASSES.includes(
            p as (typeof KNOWN_NAME_FORMAT_PASSES)[number],
          ),
      ),
    )("rejects malicious first name %j", (payload) => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields({ firstName: payload }),
        ),
      ).not.toBeNull();
    });

    it.each(KNOWN_NAME_FORMAT_PASSES)(
      "documents SQL probe passing name format %j",
      (payload) => {
        expect(
          getQualifyStepError(
            "account",
            validQualifySlice(),
            validAccountFields({ firstName: payload }),
          ),
        ).toBeNull();
      },
    );

    it.each(maliciousEmails())("rejects malicious email %j", (email) => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields({ email }),
        ),
      ).not.toBeNull();
    });

    it.each(STRICT_FIELD_ATTACKS)("rejects malicious phone %j", (phone) => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields({ phone }),
        ),
      ).not.toBeNull();
    });

    it.each(XSS_PAYLOADS)("rejects xss in last name %j", (payload) => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields({ lastName: payload }),
        ),
      ).not.toBeNull();
    });

    it("rejects short password", () => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields({ password: "short", confirmPassword: "short" }),
        ),
      ).toMatch(/10 characters/);
    });

    it("rejects mismatched passwords", () => {
      expect(
        getQualifyStepError(
          "account",
          validQualifySlice(),
          validAccountFields({
            password: "secure-pass-1",
            confirmPassword: "secure-pass-2",
          }),
        ),
      ).toMatch(/match/);
    });
  });

  describe("body_metrics injection resistance", () => {
    it.each(SQL_INJECTION)("rejects SQL in heightFt %j", (payload) => {
      expect(
        getQualifyStepError(
          "body_metrics",
          validQualifySlice({ heightFt: payload }),
        ),
      ).not.toBeNull();
    });

    it.each(SQL_INJECTION)("rejects SQL in weightLbs %j", (payload) => {
      expect(
        getQualifyStepError(
          "body_metrics",
          validQualifySlice({ weightLbs: payload }),
        ),
      ).not.toBeNull();
    });
  });

  describe("isQualifyStepComplete mirrors getQualifyStepError", () => {
    it("returns false when error exists", () => {
      expect(
        isQualifyStepComplete(
          "account",
          validQualifySlice(),
          validAccountFields({ email: "bad" }),
        ),
      ).toBe(false);
    });
  });
});

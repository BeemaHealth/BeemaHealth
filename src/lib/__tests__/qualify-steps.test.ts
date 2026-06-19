import { describe, expect, it } from "vitest";
import {
  applicableContraindicationQuestions,
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
  "gender_identity",
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
      ["gender_identity", { genderIdentity: "" }],
    ];

    it.each(choiceStepsWithoutMessage)(
      "step %s blocks progress without a user-facing message",
      (step, overrides) => {
        const data = validQualifySlice(overrides);
        expect(getQualifyStepError(step, data)).toBe("");
        expect(isQualifyStepComplete(step, data)).toBe(false);
      },
    );

    it("state_consent blocks progress without a user-facing message", () => {
      expect(
        getQualifyStepError("state_consent", validQualifySlice({ state: "" })),
      ).toBe("");
      expect(
        isQualifyStepComplete(
          "state_consent",
          validQualifySlice({ state: "" }),
        ),
      ).toBe(false);
      expect(
        getQualifyStepError(
          "state_consent",
          validQualifySlice({
            consents: { terms: false, privacy: true, telehealth: true },
          }),
        ),
      ).toBe("");
      expect(
        isQualifyStepComplete(
          "state_consent",
          validQualifySlice({
            consents: { terms: false, privacy: true, telehealth: true },
          }),
        ),
      ).toBe(false);
    });

    it("dob blocks progress without a user-facing message when empty", () => {
      expect(getQualifyStepError("dob", validQualifySlice({ dob: "" }))).toBe(
        "",
      );
      expect(isQualifyStepComplete("dob", validQualifySlice({ dob: "" }))).toBe(
        false,
      );
    });

    it("rejects under-18 DOB", () => {
      expect(
        getQualifyStepError("dob", validQualifySlice({ dob: "2015-01-01" })),
      ).toMatch(/18/);
    });

    it("body_metrics blocks progress without a user-facing message when fields are empty", () => {
      expect(
        getQualifyStepError(
          "body_metrics",
          validQualifySlice({ heightIn: "" }),
        ),
      ).toBe("");
      expect(
        isQualifyStepComplete(
          "body_metrics",
          validQualifySlice({ heightIn: "" }),
        ),
      ).toBe(false);
      expect(
        getQualifyStepError(
          "body_metrics",
          validQualifySlice({ goalWeightLbs: "" }),
        ),
      ).toBe("");
      expect(
        isQualifyStepComplete(
          "body_metrics",
          validQualifySlice({ goalWeightLbs: "" }),
        ),
      ).toBe(false);
    });

    it("contraindications blocks progress without a user-facing message", () => {
      const partialSafety = Object.fromEntries(
        applicableContraindicationQuestions(validQualifySlice())
          .slice(0, -1)
          .map((q) => [q.key, false]),
      ) as ReturnType<typeof validQualifySlice>["safety"];
      expect(
        getQualifyStepError(
          "contraindications",
          validQualifySlice({ safety: partialSafety }),
        ),
      ).toBe("");
      expect(
        isQualifyStepComplete(
          "contraindications",
          validQualifySlice({ safety: partialSafety }),
        ),
      ).toBe(false);
    });

    it.each([
      ["firstName", { firstName: "" }],
      ["lastName", { lastName: "" }],
      ["phone", { phone: "" }],
      ["email", { email: "" }],
      ["password", { password: "" }],
      ["confirmPassword", { confirmPassword: "" }],
    ] as const)(
      "account blocks progress without a user-facing message when %s is empty",
      (_field, overrides) => {
        const account = validAccountFields(overrides);
        expect(
          getQualifyStepError("account", validQualifySlice(), account),
        ).toBe("");
        expect(
          isQualifyStepComplete("account", validQualifySlice(), account),
        ).toBe(false);
      },
    );

    it("account blocks progress without a user-facing message when account is missing", () => {
      expect(getQualifyStepError("account", validQualifySlice())).toBe("");
      expect(isQualifyStepComplete("account", validQualifySlice())).toBe(false);
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

  describe("reproductive gating", () => {
    it("does not require reproductive contraindications for male/male", () => {
      const base = validQualifySlice({
        sexAssignedAtBirth: "male",
        genderIdentity: "male",
      });
      const safety = Object.fromEntries(
        applicableContraindicationQuestions(base).map((q) => [q.key, false]),
      ) as QualifyFormSlice["safety"];
      expect(
        getQualifyStepError("contraindications", { ...base, safety }),
      ).toBeNull();
    });

    it("does not require reproductive contraindications when gender identity is missing", () => {
      const base = validQualifySlice({
        sexAssignedAtBirth: "male",
        genderIdentity: "",
      });
      const safety = Object.fromEntries(
        applicableContraindicationQuestions(base).map((q) => [q.key, false]),
      ) as QualifyFormSlice["safety"];
      expect(
        getQualifyStepError("contraindications", { ...base, safety }),
      ).toBeNull();
    });

    it("requires reproductive contraindications for male at birth and female identity", () => {
      const base = validQualifySlice({
        sexAssignedAtBirth: "male",
        genderIdentity: "female",
      });
      const safety = Object.fromEntries(
        applicableContraindicationQuestions(base)
          .filter((q) => q.key !== "pregnant")
          .map((q) => [q.key, false]),
      ) as QualifyFormSlice["safety"];
      expect(
        getQualifyStepError("contraindications", { ...base, safety }),
      ).toBe("");
    });
  });
});

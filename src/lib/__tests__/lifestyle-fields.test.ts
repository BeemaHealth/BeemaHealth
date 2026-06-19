import { describe, expect, it } from "vitest";
import {
  isLifestyleStepComplete,
  isValidLifestyleFieldValue,
  lifestyleOptionLabel,
  normalizeLifestyleFields,
} from "@/lib/lifestyle-fields";
import { validIntake } from "./helpers/test-data";
import { getIntakeStepError, isIntakeStepComplete } from "@/lib/intake-steps";

describe("lifestyle-fields", () => {
  const complete = {
    exercise_days: "3",
    exercise_type: "Walking",
    diet: "balanced",
    smoke: "no",
    alcohol: "occasionally",
    drugs: "no",
    sleep: "7_8",
    binge: "never",
    night_eating: "no",
    struggle: "cravings",
  };

  it("maps legacy free-text values to structured options", () => {
    expect(
      normalizeLifestyleFields({
        diet: "Balanced",
        smoke: "No",
        alcohol: "Occasionally",
        drugs: "No",
        sleep: "7",
        binge: "No",
        night_eating: "No",
        struggle: "Cravings",
      }),
    ).toMatchObject({
      diet: "balanced",
      smoke: "no",
      alcohol: "occasionally",
      drugs: "no",
      sleep: "7_8",
      binge: "never",
      night_eating: "no",
      struggle: "cravings",
    });
  });

  it("requires drugs detail when drug use is yes", () => {
    expect(
      isLifestyleStepComplete({
        ...complete,
        drugs: "yes",
        drugs_detail: "",
      }),
    ).toBe(false);
    expect(
      isLifestyleStepComplete({
        ...complete,
        drugs: "yes",
        drugs_detail: "Cannabis",
      }),
    ).toBe(true);
  });

  it("accepts only structured enum values for dropdown fields", () => {
    expect(isValidLifestyleFieldValue("diet", "mediterranean")).toBe(true);
    expect(isValidLifestyleFieldValue("binge", "daily")).toBe(true);
    expect(isValidLifestyleFieldValue("night_eating", "most_nights")).toBe(
      true,
    );
    expect(isValidLifestyleFieldValue("diet", "Balanced")).toBe(false);
    expect(isValidLifestyleFieldValue("binge", "weekly_plus")).toBe(false);
    expect(
      isValidLifestyleFieldValue("diet", "<script>alert(1)</script>"),
    ).toBe(false);
  });

  it("formats dropdown labels for clinician display", () => {
    expect(lifestyleOptionLabel("diet", "mediterranean")).toBe("Mediterranean");
    expect(lifestyleOptionLabel("binge", "daily")).toBe("Daily");
    expect(lifestyleOptionLabel("night_eating", "1_2_week")).toBe(
      "Yes, 1–2 nights per week before bedtime",
    );
    expect(lifestyleOptionLabel("smoke", "1_3_week")).toBe(
      "1–3 times per week",
    );
    expect(lifestyleOptionLabel("struggle", "all")).toBe("All of the above");
  });

  it("maps legacy binge weekly_plus to weekly", () => {
    expect(normalizeLifestyleFields({ binge: "weekly_plus" })).toMatchObject({
      binge: "weekly",
    });
  });

  it("blocks intake step 8 without footer copy when incomplete", () => {
    const data = validIntake({ lifestyle: {} });
    expect(getIntakeStepError(8, data)).toBe("");
    expect(isIntakeStepComplete(8, data)).toBe(false);
  });

  it("blocks intake step 8 without footer copy when drugs detail missing", () => {
    const data = validIntake({
      lifestyle: {
        ...complete,
        drugs: "yes",
        drugs_detail: "",
      },
    });
    expect(getIntakeStepError(8, data)).toBe("");
    expect(isIntakeStepComplete(8, data)).toBe(false);
  });
});

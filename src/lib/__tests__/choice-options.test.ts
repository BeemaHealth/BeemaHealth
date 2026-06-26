import { describe, expect, it } from "vitest";
import {
  defaultChoiceOptions,
  nextChoiceOptionValue,
  parseChoiceOptions,
  serializeChoiceOptions,
} from "@/lib/questionnaire/choice-options";

describe("choice options", () => {
  it("creates two blank starter options", () => {
    const options = defaultChoiceOptions();
    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({
      value: "option_1",
      label: "",
      beluga: "",
    });
  });

  it("serializes beluga mapping per option for multi choice", () => {
    const serialized = serializeChoiceOptions(
      [
        { value: "lose_weight", label: "Lose weight", beluga: "beluga:sex" },
        { value: "feel_better", label: "Feel better", beluga: "" },
      ],
      "multi_choice",
    );
    expect(serialized[0].beluga).toBe("beluga:sex");
    expect(serialized[1].beluga).toBe("");
  });

  it("strips per-option beluga for single choice (field-level mapping)", () => {
    const serialized = serializeChoiceOptions(
      [{ value: "male", label: "Male", beluga: "beluga:sex" }],
      "single_choice",
    );
    expect(serialized[0].beluga).toBe("");
  });

  it("round-trips through parseChoiceOptions", () => {
    const parsed = parseChoiceOptions([
      { value: "a", label: "A", beluga: "beluga:email" },
    ]);
    expect(parsed[0]).toEqual({
      value: "a",
      label: "A",
      beluga: "beluga:email",
    });
  });

  it("picks the next unused option mapping id", () => {
    expect(
      nextChoiceOptionValue([
        { value: "option_1", label: "One", beluga: "" },
        { value: "option_2", label: "Two", beluga: "" },
      ]),
    ).toBe("option_3");
  });

  it("preserves camelCase mapping ids from beluga api names", () => {
    const serialized = serializeChoiceOptions([
      { value: "firstName", label: "Jane", beluga: "beluga:firstName" },
    ]);
    expect(serialized[0].value).toBe("firstName");
  });
});

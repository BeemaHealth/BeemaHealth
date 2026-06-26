import { describe, expect, it } from "vitest";
import { sortQuestionnaireFields } from "@/lib/questionnaire/sort-fields";

describe("sortQuestionnaireFields", () => {
  it("orders by sort_order then field_key", () => {
    const sorted = sortQuestionnaireFields([
      { field_key: "b", field_type: "text", label: "B", sort_order: 1 },
      { field_key: "a", field_type: "text", label: "A", sort_order: 0 },
      { field_key: "c", field_type: "text", label: "C", sort_order: 1 },
    ]);
    expect(sorted.map((f) => f.field_key)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { field_key: "z", field_type: "text", label: "Z", sort_order: 2 },
      { field_key: "y", field_type: "text", label: "Y", sort_order: 1 },
    ];
    const copy = [...input];
    sortQuestionnaireFields(input);
    expect(input).toEqual(copy);
  });
});

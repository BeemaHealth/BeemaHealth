import { describe, expect, it } from "vitest";
import {
  pastePosition,
  stepToClipboardPayload,
  uniqueStepKey,
} from "@/components/questionnaire/builder/flowchart-editor-history";
import type { QuestionnaireStepSchema } from "@/lib/api/client";

describe("flowchart-editor-history", () => {
  it("uniqueStepKey avoids collisions", () => {
    const existing = new Set(["step_1", "step_2"]);
    expect(uniqueStepKey(existing)).toBe("step_3");
  });

  it("stepToClipboardPayload strips ids and keeps fields", () => {
    const step: QuestionnaireStepSchema = {
      step_key: "goal",
      sort_order: 0,
      title: "Goal",
      subtitle: "",
      fields: [
        {
          id: "f1",
          field_key: "med",
          field_type: "single_choice",
          label: "Medication",
          options: [{ value: "a", label: "A" }],
        },
      ],
      routing_rules: [
        { when_field: "med", when_value: "a", next_step_key: "next" },
      ],
    };
    const payload = stepToClipboardPayload(step);
    expect(payload.title).toBe("Goal");
    expect(payload.fields).toHaveLength(1);
    expect(payload.fields[0].field_key).toBe("med");
    expect(payload.routing_rules[0].next_step_key).toBe("next");
  });

  it("pastePosition offsets from anchor", () => {
    const clipboard = {
      step: {
        title: "T",
        subtitle: "",
        visibility_rule: null,
        routing_rules: [],
        fields: [],
      },
      sourcePosition: { x: 100, y: 200 },
    };
    expect(pastePosition(clipboard, { x: 50, y: 50 }, 0)).toEqual({
      x: 98,
      y: 98,
    });
  });
});

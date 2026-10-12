import { useState } from "react";
import { sanitizeDobPart } from "@/lib/questionnaire/dob-field";
import { validateBmi, type BmiInput } from "../node-validation";
import {
  ContinueButton,
  ErrorNote,
  Field,
  FIELD_CLASS,
  NodeFrame,
} from "../ui";
import type { NodeRendererProps } from "../types";

function seed(previous: unknown): BmiInput {
  const p = (
    previous && typeof previous === "object" ? previous : {}
  ) as Record<string, unknown>;
  const heightIn = typeof p.height_in === "number" ? p.height_in : null;
  return {
    height_feet: heightIn !== null ? String(Math.floor(heightIn / 12)) : "",
    height_inches: heightIn !== null ? String(heightIn % 12) : "",
    weight_lbs: typeof p.weight_lbs === "number" ? String(p.weight_lbs) : "",
  };
}

export function BmiNode({
  node,
  previous,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const [form, setForm] = useState<BmiInput>(() => seed(previous));
  const [errors, setErrors] = useState<Partial<Record<keyof BmiInput, string>>>(
    {},
  );

  function set(key: keyof BmiInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const result = validateBmi(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    await onSubmit(result.value);
  }

  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon ?? "target"}>
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Height (feet)"
            htmlFor="bmi-feet"
            error={errors.height_feet}
          >
            <input
              id="bmi-feet"
              className={FIELD_CLASS}
              inputMode="numeric"
              placeholder="5"
              value={form.height_feet}
              disabled={busy}
              aria-invalid={errors.height_feet ? true : undefined}
              onChange={(e) =>
                set("height_feet", sanitizeDobPart(e.target.value, 1))
              }
            />
          </Field>
          <Field
            label="Height (inches)"
            htmlFor="bmi-inches"
            error={errors.height_inches}
          >
            <input
              id="bmi-inches"
              className={FIELD_CLASS}
              inputMode="numeric"
              placeholder="8"
              value={form.height_inches}
              disabled={busy}
              aria-invalid={errors.height_inches ? true : undefined}
              onChange={(e) =>
                set("height_inches", sanitizeDobPart(e.target.value, 2))
              }
            />
          </Field>
        </div>
        <Field
          label="Weight (lbs)"
          htmlFor="bmi-weight"
          error={errors.weight_lbs}
        >
          <input
            id="bmi-weight"
            className={FIELD_CLASS}
            inputMode="decimal"
            placeholder="190"
            value={form.weight_lbs}
            disabled={busy}
            aria-invalid={errors.weight_lbs ? true : undefined}
            onChange={(e) =>
              set(
                "weight_lbs",
                e.target.value.replace(/[^0-9.]/g, "").slice(0, 6),
              )
            }
          />
        </Field>
        <ErrorNote message={error} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

import { useState } from "react";
import { cn } from "@/lib/utils";
import { US_STATE_ENTRIES } from "@/lib/us-states";
import { formatPhoneInput } from "@/lib/form-validation";
import { sanitizeDobPart } from "@/lib/questionnaire/dob-field";
import { validateBasics, type BasicsInput } from "../node-validation";
import {
  ContinueButton,
  ErrorNote,
  Field,
  FIELD_CLASS,
  NodeFrame,
} from "../ui";
import { DateParts } from "./FieldNodes";
import type { NodeRendererProps } from "../types";

function seed(previous: unknown): BasicsInput {
  const p = (
    previous && typeof previous === "object" ? previous : {}
  ) as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  return {
    dob: str("dob"),
    sex_at_birth: str("sex_at_birth"),
    state: str("state"),
    zip: str("zip"),
    phone: str("phone") ? formatPhoneInput(str("phone")) : "",
  };
}

export function BasicsNode({
  node,
  previous,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const [form, setForm] = useState<BasicsInput>(() => seed(previous));
  const [errors, setErrors] = useState<
    Partial<Record<keyof BasicsInput, string>>
  >({});

  function set<K extends keyof BasicsInput>(key: K, value: BasicsInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const result = validateBasics(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    await onSubmit(result.value);
  }

  return (
    <NodeFrame title={node.title} body={node.body} icon="shield">
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          label="Date of birth"
          htmlFor="basics-dob-month"
          error={errors.dob}
        >
          <DateParts
            idPrefix="basics-dob"
            value={form.dob}
            disabled={busy}
            invalid={Boolean(errors.dob)}
            onChange={(iso) => set("dob", iso)}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-foreground">
            Sex at birth
          </legend>
          <div
            className="grid grid-cols-2 gap-3"
            role="radiogroup"
            aria-label="Sex at birth"
          >
            {(
              [
                ["female", "Female"],
                ["male", "Male"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.sex_at_birth === key}
                disabled={busy}
                onClick={() => set("sex_at_birth", key)}
                className={cn(
                  "h-14 rounded-2xl border text-base font-semibold shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  form.sex_at_birth === key
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <ErrorNote message={errors.sex_at_birth} />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="State" htmlFor="basics-state" error={errors.state}>
            <select
              id="basics-state"
              className={FIELD_CLASS}
              value={form.state}
              disabled={busy}
              autoComplete="address-level1"
              aria-invalid={errors.state ? true : undefined}
              onChange={(e) => set("state", e.target.value)}
            >
              <option value="">Select a state</option>
              {US_STATE_ENTRIES.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ZIP code" htmlFor="basics-zip" error={errors.zip}>
            <input
              id="basics-zip"
              className={FIELD_CLASS}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={form.zip}
              disabled={busy}
              aria-invalid={errors.zip ? true : undefined}
              onChange={(e) => set("zip", sanitizeDobPart(e.target.value, 5))}
            />
          </Field>
        </div>

        <Field
          label="Mobile phone"
          htmlFor="basics-phone"
          error={errors.phone}
          hint="For visit and delivery updates only."
        >
          <input
            id="basics-phone"
            className={FIELD_CLASS}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(555) 555-0100"
            value={form.phone}
            disabled={busy}
            aria-invalid={errors.phone ? true : undefined}
            onChange={(e) => set("phone", formatPhoneInput(e.target.value))}
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

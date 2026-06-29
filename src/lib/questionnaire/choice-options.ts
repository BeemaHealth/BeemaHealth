import type { QuestionnaireFieldOptionSchema } from "@/lib/api/client";

export type ChoiceOptionDraft = {
  value: string;
  label: string;
  beluga: string;
};

export function defaultChoiceOptions(count = 2): ChoiceOptionDraft[] {
  return Array.from({ length: count }, (_, i) => ({
    value: `option_${i + 1}`,
    label: "",
    beluga: "",
  }));
}

export function serializeChoiceOptions(
  options: ChoiceOptionDraft[],
  fieldType?: string,
): ChoiceOptionDraft[] {
  const stripOptionBeluga = fieldType === "single_choice";
  return options.map((opt) => ({
    value: opt.value.trim(),
    label: opt.label.trim(),
    beluga: stripOptionBeluga ? "" : opt.beluga.trim(),
  }));
}

export function parseChoiceOptions(
  options: QuestionnaireFieldOptionSchema[] | undefined,
): ChoiceOptionDraft[] {
  if (!options?.length) return defaultChoiceOptions();
  return options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    beluga: opt.beluga ?? "",
  }));
}

export function nextChoiceOptionValue(existing: ChoiceOptionDraft[]): string {
  const used = new Set(existing.map((o) => o.value));
  let n = existing.length + 1;
  let value = `option_${n}`;
  while (used.has(value)) {
    n += 1;
    value = `option_${n}`;
  }
  return value;
}

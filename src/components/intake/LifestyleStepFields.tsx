import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  ALCOHOL_OPTIONS,
  BINGE_OPTIONS,
  DIET_OPTIONS,
  DRUG_USE_OPTIONS,
  EXERCISE_DAYS_OPTIONS,
  LIFESTYLE_FIELD_LABELS,
  NIGHT_EATING_OPTIONS,
  SLEEP_OPTIONS,
  SMOKE_OPTIONS,
  STRUGGLE_OPTIONS,
} from "@/lib/lifestyle-fields";

type LifestyleData = Record<string, string | boolean | undefined>;

function LifestyleSelect({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} required={required}>
      <select
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function LifestyleStepFields({
  life,
  onChange,
}: {
  life: LifestyleData;
  onChange: (next: LifestyleData) => void;
}) {
  const patch = (patchValue: Partial<LifestyleData>) =>
    onChange({ ...life, ...patchValue });

  return (
    <div className="grid gap-3">
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.exercise_days}
        required
        value={String(life.exercise_days ?? "")}
        options={EXERCISE_DAYS_OPTIONS}
        onChange={(exercise_days) => patch({ exercise_days })}
      />
      <Field label={LIFESTYLE_FIELD_LABELS.exercise_type} required>
        <input
          className={inputCls}
          value={String(life.exercise_type ?? "")}
          placeholder="e.g. Walking, strength training, cycling"
          onChange={(e) => patch({ exercise_type: e.target.value })}
        />
      </Field>
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.diet}
        required
        value={String(life.diet ?? "")}
        options={DIET_OPTIONS}
        onChange={(diet) => patch({ diet })}
      />
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.smoke}
        required
        value={String(life.smoke ?? "")}
        options={SMOKE_OPTIONS}
        onChange={(smoke) => patch({ smoke })}
      />
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.alcohol}
        required
        value={String(life.alcohol ?? "")}
        options={ALCOHOL_OPTIONS}
        onChange={(alcohol) => patch({ alcohol })}
      />
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.drugs}
        required
        value={String(life.drugs ?? "")}
        options={DRUG_USE_OPTIONS}
        onChange={(drugs) =>
          patch({
            drugs,
            ...(drugs === "yes" ? {} : { drugs_detail: "" }),
          })
        }
      />
      {life.drugs === "yes" && (
        <Field label={LIFESTYLE_FIELD_LABELS.drugs_detail} required>
          <input
            className={inputCls}
            value={String(life.drugs_detail ?? "")}
            placeholder="e.g. cannabis, cocaine"
            onChange={(e) => patch({ drugs_detail: e.target.value })}
          />
        </Field>
      )}
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.sleep}
        required
        value={String(life.sleep ?? "")}
        options={SLEEP_OPTIONS}
        onChange={(sleep) => patch({ sleep })}
      />
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.binge}
        required
        value={String(life.binge ?? "")}
        options={BINGE_OPTIONS}
        onChange={(binge) => patch({ binge })}
      />
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.night_eating}
        required
        value={String(life.night_eating ?? "")}
        options={NIGHT_EATING_OPTIONS}
        onChange={(night_eating) => patch({ night_eating })}
      />
      <LifestyleSelect
        label={LIFESTYLE_FIELD_LABELS.struggle}
        required
        value={String(life.struggle ?? "")}
        options={STRUGGLE_OPTIONS}
        onChange={(struggle) => patch({ struggle })}
      />
    </div>
  );
}

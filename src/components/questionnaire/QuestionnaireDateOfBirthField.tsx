import { useEffect, useRef, useState, type FocusEvent } from "react";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  clampDayToMonth,
  dobDayOptions,
  dobMonthOptions,
  dobYearOptions,
  finalizeDayPart,
  finalizeMonthPart,
  finalizeYearPart,
  formatDobPartForDisplay,
  maxDayForMonthParts,
  parseIsoDateOfBirth,
  sanitizeDayPart,
  sanitizeMonthPart,
  sanitizeYearPart,
  toIsoDateOfBirth,
  validateIsoDateOfBirth,
  type DateOfBirthParts,
} from "@/lib/questionnaire/dob-field";

type QuestionnaireDateOfBirthFieldProps = {
  value: string;
  required?: boolean;
  readOnly?: boolean;
  onChange: (isoDate: string) => void;
};

type DobPart = "month" | "day" | "year";

type DobPartInputProps = {
  part: DobPart;
  label: string;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  readOnly?: boolean;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function DobPartInput({
  part,
  label,
  placeholder,
  autoComplete,
  required = false,
  readOnly = false,
  value,
  options,
  onChange,
  onBlur,
}: DobPartInputProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open || !value || !listRef.current) return;
    const selected = listRef.current.querySelector("[data-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [open, value]);

  function handleFocus() {
    setFocused(true);
    if (!readOnly) setOpen(true);
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.parentElement?.contains(next)) return;
    setFocused(false);
    setOpen(false);
    onBlur();
  }

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
  }

  const displayValue = formatDobPartForDisplay(part, value, focused);
  const maxLength = part === "year" ? 4 : 2;

  return (
    <Field label={label} required={required}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete={autoComplete}
          className={inputCls}
          placeholder={placeholder}
          maxLength={maxLength}
          value={displayValue}
          disabled={readOnly}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => onChange(e.target.value)}
        />
        {open && !readOnly && options.length > 0 ? (
          <ul
            ref={listRef}
            className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-2xl border border-border bg-card py-1 shadow-md"
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  data-selected={opt.value === value ? "true" : undefined}
                  className={[
                    "w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted",
                    opt.value === value ? "bg-muted/60 font-medium" : "",
                  ].join(" ")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}

export function QuestionnaireDateOfBirthField({
  value,
  required = false,
  readOnly = false,
  onChange,
}: QuestionnaireDateOfBirthFieldProps) {
  const [parts, setParts] = useState(() => parseIsoDateOfBirth(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setParts(parseIsoDateOfBirth(value));
    }
  }, [value]);

  function emit(updated: DateOfBirthParts) {
    const iso = toIsoDateOfBirth(updated.month, updated.day, updated.year);
    lastEmitted.current = iso;
    onChange(iso);
  }

  function applyParts(updated: DateOfBirthParts) {
    setParts(updated);
    emit(updated);
  }

  function updateMonth(raw: string) {
    const month = sanitizeMonthPart(raw);
    const day = clampDayToMonth(parts.day, month, parts.year);
    applyParts({ ...parts, month, day });
  }

  function finalizeMonth() {
    const month = finalizeMonthPart(parts.month);
    const day = clampDayToMonth(parts.day, month, parts.year);
    applyParts({ ...parts, month, day });
  }

  function updateDay(raw: string) {
    const maxDay = maxDayForMonthParts(parts.month, parts.year);
    const day = sanitizeDayPart(raw, maxDay);
    applyParts({ ...parts, day });
  }

  function finalizeDay() {
    const maxDay = maxDayForMonthParts(parts.month, parts.year);
    const day = finalizeDayPart(parts.day, maxDay);
    applyParts({ ...parts, day });
  }

  function updateYear(raw: string) {
    const year = sanitizeYearPart(raw);
    const day = clampDayToMonth(parts.day, parts.month, year);
    applyParts({ ...parts, year, day });
  }

  function finalizeYear() {
    const year = finalizeYearPart(parts.year);
    const day = clampDayToMonth(parts.day, parts.month, year);
    applyParts({ ...parts, year, day });
  }

  const maxDay = maxDayForMonthParts(parts.month, parts.year);
  const ageError =
    required && value
      ? validateIsoDateOfBirth(value, { requireAdult: true })
      : null;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-3">
        <DobPartInput
          part="month"
          label="Month"
          placeholder="MM"
          autoComplete="bday-month"
          required={required}
          readOnly={readOnly}
          value={parts.month}
          options={dobMonthOptions()}
          onChange={updateMonth}
          onBlur={finalizeMonth}
        />
        <DobPartInput
          part="day"
          label="Day"
          placeholder="DD"
          autoComplete="bday-day"
          required={required}
          readOnly={readOnly}
          value={parts.day}
          options={dobDayOptions(parts.month, parts.year)}
          onChange={updateDay}
          onBlur={finalizeDay}
        />
        <DobPartInput
          part="year"
          label="Year"
          placeholder="YYYY"
          autoComplete="bday-year"
          required={required}
          readOnly={readOnly}
          value={parts.year}
          options={dobYearOptions()}
          onChange={updateYear}
          onBlur={finalizeYear}
        />
      </div>
      {parts.day && Number(parts.day) > maxDay ? (
        <p className="text-sm text-destructive">
          That day is not valid for the selected month.
        </p>
      ) : null}
      {ageError ? (
        <p className="text-sm text-destructive">{ageError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter your birth date as MM / DD / YYYY. You must be 18 or older.
        </p>
      )}
    </div>
  );
}

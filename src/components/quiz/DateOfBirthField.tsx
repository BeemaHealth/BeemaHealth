import { useEffect, useMemo, useState } from "react";
import { computeIsAdult } from "@/lib/qualify-steps";
import { Field, inputCls } from "./quiz-primitives";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

type DateParts = { month: string; day: string; year: string };

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseIsoDate(value: string): DateParts {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { month: "", day: "", year: "" };
  }
  const [year, month, day] = value.split("-");
  return { month, day, year };
}

function toIsoDate(month: string, day: string, year: string): string {
  if (!month || !day || !year) return "";
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d) return "";
  const maxDay = daysInMonth(y, m);
  if (d < 1 || d > maxDay) return "";
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function clampDay(parts: DateParts): DateParts {
  if (!parts.month || !parts.day || !parts.year) return parts;
  const maxDay = daysInMonth(Number(parts.year), Number(parts.month));
  if (Number(parts.day) <= maxDay) return parts;
  return { ...parts, day: String(maxDay).padStart(2, "0") };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);

export function DateOfBirthField({
  value,
  onChange,
  showAgeHint = true,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  showAgeHint?: boolean;
}) {
  const [parts, setParts] = useState<DateParts>(() => parseIsoDate(value));

  useEffect(() => {
    setParts(parseIsoDate(value));
  }, [value]);

  const { month, day, year } = parts;

  const dayOptions = useMemo(() => {
    const y = Number(year) || CURRENT_YEAR;
    const m = Number(month) || 1;
    const max = daysInMonth(y, m);
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [month, year]);

  const isAdult = computeIsAdult(value);

  function update(part: "month" | "day" | "year", next: string) {
    const nextParts = clampDay({
      month: part === "month" ? next : parts.month,
      day: part === "day" ? next : parts.day,
      year: part === "year" ? next : parts.year,
    });
    setParts(nextParts);
    onChange(toIsoDate(nextParts.month, nextParts.day, nextParts.year));
  }

  const selectCls = `${inputCls} appearance-none bg-background`;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Month" required>
          <select className={selectCls} value={month} onChange={(e) => update("month", e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Day" required>
          <select className={selectCls} value={day} onChange={(e) => update("day", e.target.value)}>
            <option value="">Day</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>{Number(d)}</option>
            ))}
          </select>
        </Field>
        <Field label="Year" required>
          <select className={selectCls} value={year} onChange={(e) => update("year", e.target.value)}>
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </Field>
      </div>
      {showAgeHint && value && isAdult === false && (
        <p className="text-sm text-destructive">You must be 18 or older to continue.</p>
      )}
    </div>
  );
}

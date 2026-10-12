import type {
  DoseLog,
  HealthMetric,
  HealthMetricKind,
} from "@/lib/api/portal/shots";
import { formatMg, parseDate, toYmd } from "../portal-format";

export const INJECTION_SITES = [
  "Stomach - Upper left",
  "Stomach - Upper right",
  "Stomach - Lower left",
  "Stomach - Lower right",
  "Arm - Upper left",
  "Arm - Upper right",
  "Thigh - Left",
  "Thigh - Right",
] as const;

export function doseWhen(d: DoseLog): string {
  return d.taken_at ?? d.scheduled_at;
}

export interface SplitDoses {
  upcoming: DoseLog[];
  overdue: DoseLog[];
  history: DoseLog[];
}

const ms = (v: string) => parseDate(v)?.getTime() ?? 0;

export function splitDoses(doses: DoseLog[]): SplitDoses {
  const byTime = (a: DoseLog, b: DoseLog) =>
    ms(a.scheduled_at) - ms(b.scheduled_at);
  const scheduled = doses.filter((d) => d.status === "scheduled");
  const overdue = scheduled.filter((d) => d.is_overdue).sort(byTime);
  const upcoming = scheduled.filter((d) => !d.is_overdue).sort(byTime);
  const history = doses
    .filter((d) => d.status !== "scheduled")
    .sort((a, b) => ms(doseWhen(b)) - ms(doseWhen(a)));
  return { upcoming, overdue, history };
}

export interface MonthGroup {
  key: string;
  label: string;
  doses: DoseLog[];
}

/** Groups already-sorted (newest first) doses by calendar month. */
export function groupByMonth(doses: DoseLog[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const d of doses) {
    const date = parseDate(doseWhen(d));
    if (!date) continue;
    const key = toYmd(date).slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = {
        key,
        label: date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        doses: [],
      };
      groups.push(g);
    }
    g.doses.push(d);
  }
  return groups;
}

export interface DayMetrics {
  weight: HealthMetric | null;
  calories: HealthMetric | null;
  exercise: HealthMetric | null;
}

export function metricsForDate(
  metrics: HealthMetric[],
  ymd: string,
): DayMetrics {
  const pick = (kind: HealthMetricKind) =>
    metrics.find((m) => m.kind === kind && m.on_date === ymd) ?? null;
  return {
    weight: pick("weight"),
    calories: pick("calories"),
    exercise: pick("exercise"),
  };
}

export function doseYmd(d: DoseLog): string {
  const date = parseDate(doseWhen(d));
  return date ? toYmd(date) : "";
}

export function formatMetric(
  m: HealthMetric | null,
  kind: "weight" | "calories" | "exercise",
): string {
  if (!m) return "---";
  const n = Number.parseFloat(m.value);
  if (!Number.isFinite(n)) return "---";
  if (kind === "weight") return `${n} lbs`;
  if (kind === "calories") return `${n} kcal`;
  return `${n} min`;
}

export interface DoseFormValues {
  takenDate: string; // YYYY-MM-DD
  takenTime: string; // HH:MM
  strengthMg: string;
  injectionSite: string;
  pain: string; // "" or 0-5
  notes: string;
  weight: string;
  calories: string;
  exercise: string;
}

export type DoseFormErrors = Partial<Record<keyof DoseFormValues, string>>;

const NUM = /^\d+(\.\d{1,2})?$/;

function checkRange(
  v: string,
  min: number,
  max: number,
  label: string,
): string | undefined {
  if (v === "") return undefined;
  if (!NUM.test(v)) return `Enter a number for ${label}.`;
  const n = Number(v);
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return undefined;
}

export function validateDoseForm(
  v: DoseFormValues,
  now: Date = new Date(),
): DoseFormErrors {
  const e: DoseFormErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.takenDate))
    e.takenDate = "Choose the date you took this dose.";
  if (!/^\d{2}:\d{2}$/.test(v.takenTime)) e.takenTime = "Choose a time.";
  if (!e.takenDate && !e.takenTime) {
    const when = new Date(`${v.takenDate}T${v.takenTime}:00`);
    if (Number.isNaN(when.getTime())) e.takenDate = "Choose a valid date.";
    else if (when.getTime() > now.getTime() + 5 * 60_000)
      e.takenDate = "A dose cannot be logged in the future.";
  }
  const strength = checkRange(v.strengthMg, 0.01, 999, "Strength");
  if (strength) e.strengthMg = strength;
  if (v.pain !== "" && !/^[0-5]$/.test(v.pain))
    e.pain = "Pain is a number from 0 to 5.";
  if (v.notes.length > 2000) e.notes = "Notes can be up to 2000 characters.";
  if (v.injectionSite.length > 50)
    e.injectionSite = "Injection site is too long.";
  const w = checkRange(v.weight, 50, 1000, "Weight");
  if (w) e.weight = w;
  const c = checkRange(v.calories, 0, 20000, "Calories");
  if (c) e.calories = c;
  const x = checkRange(v.exercise, 0, 1440, "Exercise minutes");
  if (x) e.exercise = x;
  return e;
}

/** Combines the local date and time inputs into an ISO instant. */
export function toTakenAtIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function initialDoseForm(
  d: DoseLog | null,
  metrics: DayMetrics | null,
  now: Date = new Date(),
): DoseFormValues {
  const base =
    d && d.status === "taken" ? (parseDate(doseWhen(d)) ?? now) : now;
  const hh = String(base.getHours()).padStart(2, "0");
  const mm = String(base.getMinutes()).padStart(2, "0");
  const m = (x: HealthMetric | null | undefined) =>
    x ? String(Number.parseFloat(x.value)) : "";
  return {
    takenDate: toYmd(base),
    takenTime: `${hh}:${mm}`,
    strengthMg: d?.strength_mg ? String(Number.parseFloat(d.strength_mg)) : "",
    injectionSite: d?.injection_site ?? "",
    pain:
      d?.pain_0_5 === null || d?.pain_0_5 === undefined
        ? ""
        : String(d.pain_0_5),
    notes: d?.notes ?? "",
    weight: m(metrics?.weight),
    calories: m(metrics?.calories),
    exercise: m(metrics?.exercise),
  };
}

export function overdueSummary(overdueCount: number, shown: number): string {
  const extra = overdueCount - shown;
  if (extra <= 0) return "";
  return `${extra} more overdue ${extra === 1 ? "dose" : "doses"} to add.`;
}

export function doseTitle(dose: DoseLog, productName: string): string {
  return [productName, formatMg(dose.strength_mg)].filter(Boolean).join(" · ");
}

/** Shots API: dose logs and health metrics (backend/apps/clinical). */
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type DoseStatus = "scheduled" | "taken" | "skipped";
export type DoseEnteredBy = "patient" | "staff";

export interface DoseLog {
  id: string;
  treatment: string;
  scheduled_at: string;
  taken_at: string | null;
  status: DoseStatus;
  /** DRF decimal string, e.g. "7.50". */
  strength_mg: string | null;
  dose_number: number | null;
  injection_site: string;
  pain_0_5: number | null;
  notes: string;
  entered_by: DoseEnteredBy;
  auto_generated: boolean;
  is_overdue: boolean;
  created_at: string;
}

export interface DoseLogInput {
  treatment?: string;
  scheduled_at?: string;
  taken_at?: string | null;
  status?: DoseStatus;
  strength_mg?: number | null;
  injection_site?: string;
  pain_0_5?: number | null;
  notes?: string;
}

export type HealthMetricKind =
  | "weight"
  | "calories"
  | "exercise"
  | "side_effect";

export interface HealthMetric {
  id: string;
  kind: HealthMetricKind;
  /** YYYY-MM-DD */
  on_date: string;
  /** DRF decimal string. */
  value: string;
  unit: string;
  notes: string;
  created_at: string;
}

export interface HealthMetricInput {
  kind: HealthMetricKind;
  on_date: string;
  value: number;
  notes?: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DoseLogFilters {
  treatment?: string;
  status?: DoseStatus;
  overdue?: boolean;
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function listDoseLogs(
  filters: DoseLogFilters = {},
): Promise<Paginated<DoseLog>> {
  return apiGet<Paginated<DoseLog>>(
    `/treatments/dose-logs/${qs({
      treatment: filters.treatment,
      status: filters.status,
      overdue: filters.overdue ? "1" : undefined,
    })}`,
  );
}

export function createDoseLog(
  input: DoseLogInput & { treatment: string },
): Promise<DoseLog> {
  return apiPost<DoseLog>("/treatments/dose-logs/", input);
}

export function updateDoseLog(
  id: string,
  input: DoseLogInput,
): Promise<DoseLog> {
  return apiPatch<DoseLog>(
    `/treatments/dose-logs/${encodeURIComponent(id)}/`,
    input,
  );
}

export function deleteDoseLog(id: string): Promise<void> {
  return apiDelete(`/treatments/dose-logs/${encodeURIComponent(id)}/`);
}

export function listHealthMetrics(
  kind?: HealthMetricKind,
): Promise<Paginated<HealthMetric>> {
  return apiGet<Paginated<HealthMetric>>(
    `/treatments/health-metrics/${qs({ kind })}`,
  );
}

export function createHealthMetric(
  input: HealthMetricInput,
): Promise<HealthMetric> {
  return apiPost<HealthMetric>("/treatments/health-metrics/", input);
}

export function updateHealthMetric(
  id: string,
  input: Partial<HealthMetricInput>,
): Promise<HealthMetric> {
  return apiPatch<HealthMetric>(
    `/treatments/health-metrics/${encodeURIComponent(id)}/`,
    input,
  );
}

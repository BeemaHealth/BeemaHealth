import { CheckCircle2, XCircle } from "lucide-react";
import type { BelugaVisitPayloadSnapshot } from "@/lib/types/mvp";
import { getBelugaExpectedType } from "@/lib/questionnaire/beluga-field-types";
import { NOTICE_BANNER_STYLES } from "@/lib/design-tokens";

function statusLabel(status: string): string {
  if (status === "filled") return "Ready";
  if (status === "missing_value") return "Missing value";
  return "Unmapped";
}

function statusClass(status: string): string {
  if (status === "filled") return "text-success font-medium";
  return "text-destructive font-medium";
}

type BelugaVisitPayloadPanelProps = {
  payload: BelugaVisitPayloadSnapshot;
  /** staff = full API detail; patient = summary only */
  variant?: "staff" | "patient";
};

/**
 * Staff- and snapshot-facing proof that a resolved Beluga visit ``formObj``
 * satisfies required mappings. Sourced from frozen submission snapshots.
 */
export function BelugaVisitPayloadPanel({
  payload,
  variant = "staff",
}: BelugaVisitPayloadPanelProps) {
  const showApiDetail = variant === "staff";
  const ready = payload.ready;
  const bannerStyle = ready
    ? "border-success/30 bg-success/10"
    : NOTICE_BANNER_STYLES.warning;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border px-4 py-3 text-sm ${bannerStyle}`}>
        <div className="flex items-start gap-3">
          {ready ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          )}
          <div>
            <p className="font-semibold text-foreground">
              Beluga visit payload{" "}
              {ready ? "ready to send" : "not ready to send"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {payload.ready_count} of {payload.required_count} required fields
              resolved
              {payload.missing.length > 0
                ? ` · missing: ${payload.missing.join(", ")}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {showApiDetail ? (
        <>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">API field</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Expected type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payload.fields.map((row) => {
                    const expected = getBelugaExpectedType(row.api_field_id);
                    return (
                      <tr key={row.beluga} className="bg-background">
                        <td className="px-3 py-2 font-mono text-xs text-foreground">
                          {row.api_field_id}
                        </td>
                        <td className="px-3 py-2 text-foreground">
                          {row.label}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="font-mono text-foreground">
                            {expected.kind}
                          </span>
                          <p className="mt-0.5 text-muted-foreground max-w-[180px]">
                            {expected.description}
                          </p>
                        </td>
                        <td
                          className={`px-3 py-2 text-xs ${statusClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </td>
                        <td className="px-3 py-2 text-foreground max-w-[200px] truncate">
                          {row.value ?? (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {row.source_label
                            ? `${row.source ?? "?"} · ${row.source_label}`
                            : row.status === "unmapped"
                              ? "No question mapped"
                              : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
              formObj preview (JSON)
            </p>
            <pre className="overflow-x-auto p-4 text-xs font-mono text-foreground leading-relaxed">
              {JSON.stringify({ formObj: payload.form_obj }, null, 2)}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}

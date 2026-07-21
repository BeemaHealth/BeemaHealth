import type { BelugaDoctorReview } from "@/lib/questionnaire/beluga-review";
import { buildBelugaFormObjPreview } from "@/lib/questionnaire/beluga-review";
import { getBelugaExpectedType } from "@/lib/questionnaire/beluga-field-types";

function statusLabel(status: string): string {
  if (status === "filled") return "Ready";
  if (status === "missing_value") return "Missing value";
  return "Unmapped";
}

function statusClass(status: string): string {
  if (status === "filled") return "text-success font-medium";
  return "text-destructive font-medium";
}

type BelugaPayloadDevTableProps = {
  review: BelugaDoctorReview;
};

/**
 * Dev-only Beluga visit payload inspector (localhost / `npm run dev`).
 * Lists every `formObj` field: ready to send vs missing vs unmapped.
 */
export function BelugaPayloadDevTable({ review }: BelugaPayloadDevTableProps) {
  const formObj = buildBelugaFormObjPreview(review);
  const readyCount = review.fields.filter((f) => f.status === "filled").length;
  const missingCount = review.fields.length - readyCount;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">
          Dev: Beluga visit payload
        </p>
        <p className="mt-1 text-muted-foreground">
          {readyCount} ready · {missingCount} not ready. This panel only appears
          in development (not production).
        </p>
      </div>

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
              {review.fields.map((row) => {
                const expected = getBelugaExpectedType(row.apiFieldId);
                return (
                  <tr key={row.beluga} className="bg-background">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {row.apiFieldId}
                    </td>
                    <td className="px-3 py-2 text-foreground">{row.label}</td>
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
                      {row.sourceLabel
                        ? `${row.source ?? "?"} · ${row.sourceLabel}`
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
          {JSON.stringify({ formObj }, null, 2)}
        </pre>
      </div>

      {review.qaEntries.length > 0 ? (
        <div className="rounded-2xl border border-border overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
            intakeResults Q/A (unmapped questions)
          </p>
          <pre className="overflow-x-auto p-4 text-xs font-mono text-foreground leading-relaxed">
            {JSON.stringify(
              review.qaEntries.map((q) => ({
                question: q.question,
                answer: q.answer,
                source: q.source,
              })),
              null,
              2,
            )}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

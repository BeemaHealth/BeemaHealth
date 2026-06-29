import { CheckCircle2 } from "lucide-react";
import type { BelugaVisitPayloadSnapshot } from "@/lib/types/mvp";

type QuestionnaireReviewSubmittedViewProps = {
  confirmedAt?: string | null;
  belugaPayload?: BelugaVisitPayloadSnapshot | null;
};

function formatConfirmedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Read-only portal view after intake submission — no live gate recompute. */
export function QuestionnaireReviewSubmittedView({
  confirmedAt,
  belugaPayload,
}: QuestionnaireReviewSubmittedViewProps) {
  const filledFields =
    belugaPayload?.fields.filter((f) => f.status === "filled") ?? [];
  const confirmedLabel = confirmedAt
    ? `Confirmed ${formatConfirmedDate(confirmedAt)}`
    : "Confirmed at submission";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="font-medium text-foreground">
              You reviewed and confirmed your answers
            </p>
            <p className="mt-1 text-muted-foreground">{confirmedLabel}</p>
          </div>
        </div>
      </div>

      {filledFields.length > 0 ? (
        <section className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
          <p className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            Information sent for clinician review
          </p>
          <dl className="divide-y divide-border">
            {filledFields.map((field) => (
              <div
                key={field.api_field_id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] sm:gap-4"
              >
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="text-sm text-foreground whitespace-pre-line">
                  {field.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        <p className="text-sm text-foreground">
          I confirmed these answers are complete and accurate to the best of my
          knowledge.
        </p>
      </div>
    </div>
  );
}

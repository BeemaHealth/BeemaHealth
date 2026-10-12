import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus, Syringe } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { listDoseLogs, listHealthMetrics } from "@/lib/api/portal/shots";
import { listTreatments } from "@/lib/api/portal/treatments";
import { EmptyState, ErrorState, LoadingBlock } from "../PortalStates";
import { formatMg } from "../portal-format";
import { shotsKeys, treatmentKeys } from "../query-keys";
import { HistoryDoseCard, ScheduledDoseCard } from "./DoseCards";
import { DoseFormDialog, type DoseFormTarget } from "./DoseFormDialog";
import {
  doseYmd,
  groupByMonth,
  metricsForDate,
  overdueSummary,
  splitDoses,
} from "./shots-model";

const SHOWN_SCHEDULED = 4;

export function ShotsPanel() {
  const doses = useQuery({
    queryKey: shotsKeys.doses,
    queryFn: () => listDoseLogs(),
  });
  const metrics = useQuery({
    queryKey: shotsKeys.metrics,
    queryFn: () => listHealthMetrics(),
  });
  const treatments = useQuery({
    queryKey: treatmentKeys.list("active"),
    queryFn: () => listTreatments("active"),
  });
  const [target, setTarget] = useState<DoseFormTarget | null>(null);
  const [showAll, setShowAll] = useState(false);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of treatments.data?.results ?? [])
      map.set(t.id, t.product_name);
    return map;
  }, [treatments.data]);

  const split = useMemo(
    () => splitDoses(doses.data?.results ?? []),
    [doses.data],
  );
  const months = useMemo(() => groupByMonth(split.history), [split.history]);
  const metricList = metrics.data?.results ?? [];

  if (doses.isPending) return <LoadingBlock rows={3} label="Loading doses" />;
  if (doses.isError)
    return (
      <ErrorState error={doses.error} onRetry={() => void doses.refetch()} />
    );

  const options = (treatments.data?.results ?? []).map((t) => ({
    id: t.id,
    name: t.product_name,
  }));
  const nameOf = (treatmentId: string) => names.get(treatmentId) ?? "";
  const scheduled = [...split.overdue, ...split.upcoming];
  const visible = showAll ? scheduled : scheduled.slice(0, SHOWN_SCHEDULED);
  const taken = split.history.filter((d) => d.status === "taken");
  const last = taken[0];

  if (scheduled.length === 0 && split.history.length === 0) {
    return (
      <>
        <EmptyState
          icon={Syringe}
          title="No doses yet"
          body="Your schedule appears once your treatment is prescribed. You can also log a dose yourself."
          action={
            <Button
              type="button"
              onClick={() => setTarget({ mode: "new" })}
              disabled={options.length === 0}
            >
              <Plus aria-hidden="true" />
              Add new
            </Button>
          }
        />
        <DoseFormDialog
          target={target}
          treatments={options}
          metrics={metricList}
          onClose={() => setTarget(null)}
        />
      </>
    );
  }

  return (
    <div className="grid gap-8">
      <section
        aria-labelledby="next-doses"
        className="rounded-3xl bg-muted/60 p-4 sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="next-doses"
            className="flex items-center gap-2 font-display text-lg font-semibold"
          >
            <Syringe className="size-5" aria-hidden="true" />
            Next scheduled dose
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={options.length === 0}
            onClick={() => setTarget({ mode: "new" })}
          >
            <Plus aria-hidden="true" />
            Add new
          </Button>
        </div>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You are all caught up. No doses are scheduled right now.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visible.map((d, i) => (
              <ScheduledDoseCard
                key={d.id}
                dose={d}
                index={i}
                productName={nameOf(d.treatment)}
                onAdd={(dose) => setTarget({ mode: "log", dose })}
              />
            ))}
          </ul>
        )}
        {scheduled.length > SHOWN_SCHEDULED && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>
              {showAll
                ? ""
                : overdueSummary(
                    split.overdue.length,
                    visible.filter((d) => d.is_overdue).length,
                  ) || `${scheduled.length - SHOWN_SCHEDULED} more scheduled.`}
            </span>
            <button
              type="button"
              className="font-medium underline underline-offset-4"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer" : "View all"}
            </button>
          </div>
        )}
      </section>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Doses taken</dt>
          <dd className="mt-1 font-display text-2xl font-semibold">
            {taken.length}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Last dose</dt>
          <dd className="mt-1 font-display text-2xl font-semibold">
            {last ? formatMg(last.strength_mg) || "Logged" : "None yet"}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="dose-history" className="grid gap-4">
        <h2
          id="dose-history"
          className="flex items-center gap-2 font-display text-lg font-semibold"
        >
          <CalendarDays className="size-5" aria-hidden="true" />
          Doses history
        </h2>
        {metrics.isError && (
          <p role="status" className="text-sm text-muted-foreground">
            Weight, calories and exercise could not be loaded right now.
          </p>
        )}
        {months.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Doses you log will show up here.
          </p>
        ) : (
          months.map((m) => (
            <div key={m.key} className="grid gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {m.label}
              </h3>
              <ul className="grid gap-3 lg:grid-cols-2">
                {m.doses.map((d) => (
                  <HistoryDoseCard
                    key={d.id}
                    dose={d}
                    productName={nameOf(d.treatment)}
                    metrics={metricsForDate(metricList, doseYmd(d))}
                    onEdit={(dose) => setTarget({ mode: "edit", dose })}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <DoseFormDialog
        target={target}
        treatments={options}
        metrics={metricList}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}

import { Link, createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Bell, MessageSquare, Pill, Stethoscope, Truck } from "lucide-react";
import { CaseTimeline } from "@/components/portal/CaseTimeline";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/dashboard-loader";
import { buildCareTimeline, getStatusSummary } from "@/lib/dashboard-status";
import { cn } from "@/lib/utils";

const dashboardRoute = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomePage,
});

function statusBadgeTone(status: string) {
  switch (status) {
    case "under_review":
    case "more_info_needed":
      return "warning" as const;
    case "approved":
    case "prescription_sent":
      return "success" as const;
    case "not_approved":
      return "muted" as const;
    default:
      return "info" as const;
  }
}

function SummaryCard({
  icon: Icon,
  title,
  status,
  sub,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  status: string;
  sub: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-4 shadow-soft md:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{status}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DashboardHomePage() {
  const data = dashboardRoute.useLoaderData();
  const summary = getStatusSummary(data.intake_status);
  const timeline = buildCareTimeline(data.intake_status, data.submitted_at);
  const statusLabel = STATUS_LABELS[data.intake_status] ?? data.intake_status;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title={`Welcome back, ${data.user.first_name}`}
        subtitle="Here's where your care stands today."
      />

      <section className="rounded-3xl border border-primary/10 bg-primary-soft/40 p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">Current status</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
              {statusLabel}
            </h2>
          </div>
          <StatusBadge
            label={statusLabel}
            tone={statusBadgeTone(data.intake_status)}
          />
        </div>

        {data.intake_status === "more_info_needed" && data.patient_note && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div className="flex gap-3">
              <Bell
                className="mt-0.5 size-5 shrink-0 text-warning"
                aria-hidden
              />
              <div>
                <p className="font-medium text-foreground">
                  Next action needed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.patient_note}
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 rounded-xl">
              <Link to="/dashboard/intake">Update intake →</Link>
            </Button>
          </div>
        )}

        {data.intake_status === "draft" && (
          <div className="mt-6">
            <Button asChild className="rounded-xl">
              <Link to="/intake">Continue intake →</Link>
            </Button>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Stethoscope}
          title="Provider review"
          status={summary.providerReview.label}
          sub={summary.providerReview.sub}
        />
        <SummaryCard
          icon={Pill}
          title="Prescription"
          status={summary.prescription.label}
          sub={summary.prescription.sub}
        />
        <SummaryCard
          icon={Truck}
          title="Shipping"
          status={summary.shipping.label}
          sub={summary.shipping.sub}
        />
        <SummaryCard
          icon={MessageSquare}
          title="Messages"
          status="Coming soon"
          sub="Secure messaging"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:col-span-2 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Case timeline
            </h2>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/dashboard/intake">
                {data.intake_status === "more_info_needed"
                  ? "Update intake"
                  : data.intake_status === "draft"
                    ? "Continue intake"
                    : "View intake (read-only)"}
              </Link>
            </Button>
          </div>
          <CaseTimeline events={timeline} />
        </section>

        <div className="space-y-4">
          {data.patient_note && data.intake_status !== "more_info_needed" && (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-sm font-semibold text-foreground">
                Care team note
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {data.patient_note}
              </p>
            </section>
          )}

          <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-foreground">
              Your order
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.intake_status === "prescription_sent" ||
              data.intake_status === "approved"
                ? "Order tracking will appear here once pharmacy fulfillment is connected."
                : "No active order. Your medication will appear here once approved and shipped."}
            </p>
            {(data.intake_status === "prescription_sent" ||
              data.intake_status === "approved") && (
              <Link
                to="/dashboard/orders"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                View orders →
              </Link>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-foreground">Refills</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.intake_status === "prescription_sent" ||
              data.intake_status === "approved"
                ? "Log side effects and request a refill when you are ready."
                : "Refill management opens after your prescription is active."}
            </p>
            {(data.intake_status === "prescription_sent" ||
              data.intake_status === "approved") && (
              <Link
                to="/dashboard/refills"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                Request refill →
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

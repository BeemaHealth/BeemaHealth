import { Link, createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Bell, MessageSquare, Pill, Stethoscope, Truck } from "lucide-react";
import { CareTeamMessageThread } from "@/components/portal/CareTeamMessageThread";
import { CaseTimeline } from "@/components/portal/CaseTimeline";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { careTeamMessageCount } from "@/lib/care-team-messages";
import { STATUS_LABELS } from "@/lib/dashboard-loader";
import { canManageRefills, getStatusSummary } from "@/lib/dashboard-status";
import {
  DASHBOARD_SUMMARY_ICON_STYLES,
  type DashboardSummaryIconTone,
} from "@/lib/design-tokens";
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
  iconTone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  status: string;
  sub: string;
  iconTone: DashboardSummaryIconTone;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-soft md:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            DASHBOARD_SUMMARY_ICON_STYLES[iconTone],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{status}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DashboardHomePage() {
  const data = dashboardRoute.useLoaderData();
  const careEvents = data.care_events ?? [];
  const summary = getStatusSummary(data.intake_status, careEvents);
  const statusLabel = STATUS_LABELS[data.intake_status] ?? data.intake_status;
  const refillsAvailable = canManageRefills(data.has_active_prescription);
  const messageCount = careTeamMessageCount(data.patient_note);
  const hasCareTeamMessages = messageCount > 0;

  if (data.intake_status === "draft") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PortalPageHeader
          title={`Welcome, ${data.user.first_name}`}
          subtitle="Complete your medical intake to get started."
        />
        <div className="rounded-3xl border border-primary/15 bg-primary-soft/70 p-8 md:p-10">
          <p className="text-sm font-medium text-primary">
            No intake submitted yet
          </p>
          <h2 className="mt-1 text-2xl font-bold text-primary md:text-3xl">
            Finish your intake to continue
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Your medical intake is saved as a draft. Pick up where you left off
            to complete your evaluation and connect with a provider.
          </p>
          <div className="mt-6">
            <Button asChild className="rounded-xl">
              <Link to="/intake">Continue draft →</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title={`Welcome back, ${data.user.first_name}`}
        subtitle="Here's where your care stands today."
      />

      <section className="rounded-3xl border border-primary/15 bg-primary-soft/70 p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">Current status</p>
            <h2 className="mt-1 text-2xl font-bold text-primary md:text-3xl">
              {statusLabel}
            </h2>
          </div>
          <StatusBadge
            label={statusLabel}
            tone={statusBadgeTone(data.intake_status)}
          />
        </div>

        {data.intake_status === "more_info_needed" && hasCareTeamMessages && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/10 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div className="flex gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/25 text-warning-foreground">
                <Bell className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-foreground">
                  Next action needed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your care team left{" "}
                  {messageCount === 1
                    ? "a message"
                    : `${messageCount} messages`}{" "}
                  below. Review them and update your intake when you are ready.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 rounded-xl">
              <Link to="/dashboard/intake">Update intake →</Link>
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
          iconTone="review"
        />
        <SummaryCard
          icon={Pill}
          title="Prescription"
          status={summary.prescription.label}
          sub={summary.prescription.sub}
          iconTone="prescription"
        />
        <SummaryCard
          icon={Truck}
          title="Shipping"
          status={summary.shipping.label}
          sub={summary.shipping.sub}
          iconTone="shipping"
        />
        <SummaryCard
          icon={MessageSquare}
          title="Messages"
          status={
            hasCareTeamMessages
              ? `${messageCount} message${messageCount === 1 ? "" : "s"}`
              : "No messages yet"
          }
          sub={
            hasCareTeamMessages
              ? "From your care team"
              : "We will notify you when your team reaches out"
          }
          iconTone="messages"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-soft lg:col-span-2 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Case timeline
            </h2>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/dashboard/intake">
                {data.intake_status === "more_info_needed"
                  ? "Update intake"
                  : "View intake (read-only)"}
              </Link>
            </Button>
          </div>
          <div className="relative lg:flex-1">
            <CaseTimeline
              intakeStatus={data.intake_status}
              submittedAt={data.submitted_at}
              careEvents={careEvents}
              refillRequests={data.refill_requests ?? []}
              className="max-h-80 lg:absolute lg:inset-0 lg:max-h-none"
            />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Care team messages
              </h2>
              {hasCareTeamMessages && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {messageCount}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Updates from your provider and support team appear here. Reply is
              not available yet; we will email or text you based on your
              notification settings.
            </p>
            <div className="mt-4">
              <CareTeamMessageThread patientNote={data.patient_note} />
            </div>
          </section>

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
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
            >
              <Link to="/dashboard/orders">View orders →</Link>
            </Button>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-foreground">Refills</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {refillsAvailable
                ? "Log side effects and request a refill when you are ready."
                : "Refill management opens after your clinician prescribes medication."}
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
            >
              <Link to="/dashboard/refills">
                {refillsAvailable ? "Request refill →" : "View refills →"}
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}

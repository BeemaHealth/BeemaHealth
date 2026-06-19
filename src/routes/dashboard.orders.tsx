import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { STATUS_LABELS } from "@/lib/dashboard-loader";

const dashboardRoute = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/orders")({
  component: DashboardOrdersPage,
});

function DashboardOrdersPage() {
  const data = dashboardRoute.useLoaderData();
  const statusLabel = STATUS_LABELS[data.intake_status] ?? data.intake_status;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Your orders"
        subtitle="Track your medication from pharmacy to your door"
      />
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <p className="text-muted-foreground">
          {data.intake_status === "prescription_sent" ||
          data.intake_status === "approved" ? (
            <>
              Your case status is <strong>{statusLabel}</strong>. Pharmacy order
              tracking will appear here once fulfillment is connected.
            </>
          ) : (
            <>
              No orders yet. Once your prescription is approved and sent to a
              pharmacy, fulfillment updates will appear here.
            </>
          )}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Aretide coordinates fulfillment with licensed pharmacies. You&apos;ll
        receive your medication in Aretide packaging.
      </p>
    </div>
  );
}

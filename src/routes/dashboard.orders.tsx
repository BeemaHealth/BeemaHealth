import { Link, createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Info, Package, Truck } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { STATUS_LABELS } from "@/lib/dashboard-loader";

const dashboardRoute = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/orders")({
  component: DashboardOrdersPage,
});

function DashboardOrdersPage() {
  const data = dashboardRoute.useLoaderData();
  const statusLabel = STATUS_LABELS[data.intake_status] ?? data.intake_status;
  const hasPrescriptionActivity =
    data.intake_status === "prescription_sent" ||
    data.intake_status === "approved";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Your orders"
        subtitle="Track your medication from pharmacy to your door"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <AccountSectionCard
          title="Order status"
          description="Fulfillment updates once your prescription is at the pharmacy"
          icon={Truck}
          tone="orders"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            {hasPrescriptionActivity ? (
              <>
                Your case status is{" "}
                <span className="font-medium text-foreground">
                  {statusLabel}
                </span>
                . Pharmacy order tracking will appear here once fulfillment is
                connected.
              </>
            ) : (
              <>
                No orders yet. Once your prescription is approved and sent to a
                pharmacy, fulfillment updates will appear here.
              </>
            )}
          </p>
        </AccountSectionCard>

        <AccountSectionCard
          title="Aretide fulfillment"
          description="How your medication is packaged and delivered"
          icon={Package}
          tone="contact"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            Aretide coordinates fulfillment with licensed pharmacies.
            You&apos;ll receive your medication in Aretide packaging with
            tracking details posted here when available.
          </p>
        </AccountSectionCard>
      </div>

      {hasPrescriptionActivity && (
        <AccountSectionCard
          title="What to expect"
          description="While pharmacy integration is being connected"
          icon={Info}
          tone="communication"
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Your clinician has approved or sent your prescription.</li>
            <li>
              Shipment and delivery milestones will show on this page when
              fulfillment is live.
            </li>
            <li>
              Check your{" "}
              <Link
                to="/dashboard"
                className="font-medium text-foreground hover:underline"
              >
                dashboard
              </Link>{" "}
              for the latest case status.
            </li>
          </ul>
        </AccountSectionCard>
      )}
    </div>
  );
}

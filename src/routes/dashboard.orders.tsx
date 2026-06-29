import { Link, createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Info, Package, Truck } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { STATUS_LABELS } from "@/lib/dashboard-loader";
import type { PharmacyOrderStatus } from "@/lib/types/mvp";

const dashboardRoute = getRouteApi("/dashboard");

const PHARMACY_STATUS_LABELS: Record<PharmacyOrderStatus, string> = {
  created: "Order created",
  submitted: "Sent to pharmacy",
  received: "Received by pharmacy",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  error: "Error",
  on_hold: "On hold",
};

export const Route = createFileRoute("/dashboard/orders")({
  component: DashboardOrdersPage,
});

function DashboardOrdersPage() {
  const data = dashboardRoute.useLoaderData();
  const statusLabel = STATUS_LABELS[data.intake_status] ?? data.intake_status;
  const order = data.pharmacy_order ?? null;
  const hasPrescriptionActivity =
    data.intake_status === "prescription_sent" ||
    data.intake_status === "approved" ||
    Boolean(order);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Your orders"
        subtitle="Track your medication from pharmacy to your door"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <AccountSectionCard
          title="Order status"
          description="Fulfillment updates from our pharmacy partner"
          icon={Truck}
          tone="orders"
        >
          {order ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Fulfillment status</dt>
                <dd className="font-medium text-foreground">
                  {PHARMACY_STATUS_LABELS[order.status] ?? order.status}
                </dd>
              </div>
              {order.tracking_number ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tracking</dt>
                  <dd className="font-medium text-foreground">
                    {order.carrier ? `${order.carrier} · ` : ""}
                    {order.tracking_number}
                  </dd>
                </div>
              ) : null}
              {order.submitted_at ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="text-foreground">
                    {new Date(order.submitted_at).toLocaleDateString()}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {hasPrescriptionActivity ? (
                <>
                  Your case status is{" "}
                  <span className="font-medium text-foreground">
                    {statusLabel}
                  </span>
                  . Pharmacy order tracking will appear here once your
                  prescription is sent for fulfillment.
                </>
              ) : (
                <>
                  No orders yet. Once your prescription is approved and sent to
                  a pharmacy, fulfillment updates will appear here.
                </>
              )}
            </p>
          )}
        </AccountSectionCard>

        <AccountSectionCard
          title="Aretide fulfillment"
          description="How your medication is packaged and delivered"
          icon={Package}
          tone="contact"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            Aretide coordinates fulfillment with licensed pharmacies.
            You&apos;ll receive your medication in packaging with
            tracking details posted here when available.
          </p>
        </AccountSectionCard>
      </div>

      {hasPrescriptionActivity && (
        <AccountSectionCard
          title="What to expect"
          description="Fulfillment milestones"
          icon={Info}
          tone="communication"
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Your clinician has approved or sent your prescription.</li>
            <li>
              Shipment and delivery milestones appear on this page as the
              pharmacy processes your order.
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

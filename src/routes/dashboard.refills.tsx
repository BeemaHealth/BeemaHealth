import { Link, createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ClipboardList, Pill } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { RefillForm } from "@/components/portal/RefillForm";
import {
  fetchPatientPrescription,
  fetchRefillConfig,
  fetchRefillRequests,
  fetchSideEffectCheckIns,
} from "@/lib/api/client";
import {
  canManageRefills,
  hasUnresolvedDeliveryIssue,
} from "@/lib/dashboard-status";

const dashboardRoute = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/refills")({
  loader: async () => {
    const [prescription, checkIns, refillData, refillConfig] =
      await Promise.all([
        fetchPatientPrescription(),
        fetchSideEffectCheckIns(),
        fetchRefillRequests(),
        fetchRefillConfig(),
      ]);
    return {
      prescription,
      checkIns,
      refillRequests: refillData.refill_requests,
      refillCooldown: refillData.cooldown,
      refillConfig,
    };
  },
  component: DashboardRefillsPage,
});

function DashboardRefillsPage() {
  const {
    prescription,
    checkIns,
    refillRequests,
    refillCooldown,
    refillConfig,
  } = Route.useLoaderData();
  const { care_events } = dashboardRoute.useLoaderData();
  const canRefill = canManageRefills(prescription?.is_active === true);
  const deliveryIssue = hasUnresolvedDeliveryIssue(care_events ?? []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Request a refill"
        subtitle={
          canRefill
            ? "A quick check-in keeps your care safe"
            : "Available after your clinician prescribes medication"
        }
      />

      {canRefill && prescription ? (
        <RefillForm
          prescription={prescription}
          drugConfig={refillConfig}
          initialCheckIns={checkIns.slice(0, 5)}
          initialRefillRequests={refillRequests.slice(0, 5)}
          initialCooldown={refillCooldown}
          hasDeliveryIssue={deliveryIssue}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <AccountSectionCard
            title="No prescription yet"
            description="Refills open after your clinician prescribes medication"
            icon={Pill}
            tone="refills"
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your clinician has not prescribed medication yet. Side-effect
              check-ins and refill requests will open here once a prescription
              is on file.
            </p>
          </AccountSectionCard>

          <AccountSectionCard
            title="What happens next"
            description="How refill management works"
            icon={ClipboardList}
            tone="contact"
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                Log side effects before each refill so your care team can review
                your progress.
              </li>
              <li>
                Submit a refill request when you are ready for your next
                shipment.
              </li>
              <li>
                Check your{" "}
                <Link
                  to="/dashboard"
                  className="font-medium text-foreground hover:underline"
                >
                  dashboard
                </Link>{" "}
                for review status updates.
              </li>
            </ul>
          </AccountSectionCard>
        </div>
      )}
    </div>
  );
}

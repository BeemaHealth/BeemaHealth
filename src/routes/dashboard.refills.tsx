import { Link, createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Pill } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { RefillForm } from "@/components/portal/RefillForm";
import {
  fetchPatientPrescription,
  fetchRefillRequests,
  fetchSideEffectCheckIns,
} from "@/lib/api/client";
import { canManageRefills } from "@/lib/dashboard-status";

export const Route = createFileRoute("/dashboard/refills")({
  loader: async () => {
    const [prescription, checkIns, refillRequests] = await Promise.all([
      fetchPatientPrescription(),
      fetchSideEffectCheckIns(),
      fetchRefillRequests(),
    ]);
    return { prescription, checkIns, refillRequests };
  },
  component: DashboardRefillsPage,
});

function DashboardRefillsPage() {
  const { prescription, checkIns, refillRequests } = Route.useLoaderData();
  const canRefill = canManageRefills(prescription?.is_active === true);

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
          initialCheckIns={checkIns.slice(0, 5)}
          initialRefillRequests={refillRequests.slice(0, 5)}
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

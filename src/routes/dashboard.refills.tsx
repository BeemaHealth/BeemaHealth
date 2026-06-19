import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { RefillForm } from "@/components/portal/RefillForm";
import {
  fetchIntakeMe,
  fetchRefillRequests,
  fetchSideEffectCheckIns,
} from "@/lib/api/client";
import { canManageRefills, getMedicationLabel } from "@/lib/dashboard-status";

const dashboardRoute = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/refills")({
  loader: async () => {
    const [intake, checkIns, refillRequests] = await Promise.all([
      fetchIntakeMe(),
      fetchSideEffectCheckIns(),
      fetchRefillRequests(),
    ]);
    return { intake, checkIns, refillRequests };
  },
  component: DashboardRefillsPage,
});

function DashboardRefillsPage() {
  const { treatment_interest, intake_status } = dashboardRoute.useLoaderData();
  const { intake, checkIns, refillRequests } = Route.useLoaderData();
  const prefs = (intake?.medication_preferences ?? {}) as Record<
    string,
    string | boolean
  >;
  const medicationLabel = getMedicationLabel(
    typeof prefs.treatment === "string" ? prefs.treatment : undefined,
    treatment_interest,
  );
  const prescribed = canManageRefills(intake_status);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl">
        <PortalPageHeader
          title="Request a refill"
          subtitle={
            prescribed
              ? "A quick check-in keeps your care safe"
              : "Available after your prescription is active"
          }
        />
      </div>
      <RefillForm
        medicationLabel={medicationLabel}
        canManageRefills={prescribed}
        initialCheckIns={checkIns.slice(0, 5)}
        initialRefillRequests={refillRequests.slice(0, 5)}
      />
    </div>
  );
}

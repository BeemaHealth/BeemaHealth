import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { RefillForm } from "@/components/portal/RefillForm";
import { fetchIntakeMe } from "@/lib/api/client";
import { getMedicationLabel } from "@/lib/dashboard-status";

const dashboardRoute = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/refills")({
  loader: async () => {
    const intake = await fetchIntakeMe();
    return { intake };
  },
  component: DashboardRefillsPage,
});

function DashboardRefillsPage() {
  const { treatment_interest } = dashboardRoute.useLoaderData();
  const { intake } = Route.useLoaderData();
  const prefs = (intake?.medication_preferences ?? {}) as Record<
    string,
    string | boolean
  >;
  const medicationLabel = getMedicationLabel(
    typeof prefs.treatment === "string" ? prefs.treatment : undefined,
    treatment_interest,
  );

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl">
        <PortalPageHeader
          title="Request a refill"
          subtitle="A quick check-in keeps your care safe"
        />
      </div>
      <RefillForm medicationLabel={medicationLabel} />
    </div>
  );
}

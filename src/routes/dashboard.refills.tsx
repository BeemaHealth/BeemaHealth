import { Link, createFileRoute } from "@tanstack/react-router";
import { Pill } from "lucide-react";
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
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl">
        <PortalPageHeader
          title="Request a refill"
          subtitle={
            canRefill
              ? "A quick check-in keeps your care safe"
              : "Available after your clinician prescribes medication"
          }
        />
      </div>

      {canRefill && prescription ? (
        <RefillForm
          prescription={prescription}
          initialCheckIns={checkIns.slice(0, 5)}
          initialRefillRequests={refillRequests.slice(0, 5)}
        />
      ) : (
        <div className="mx-auto max-w-2xl">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Pill className="size-6" aria-hidden />
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    No prescription yet
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Your clinician has not prescribed medication yet.
                    Side-effect check-ins and refill requests will open here
                    once a prescription is on file.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check your{" "}
                  <Link
                    to="/dashboard"
                    className="font-medium text-primary hover:underline"
                  >
                    dashboard
                  </Link>{" "}
                  for review status updates.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

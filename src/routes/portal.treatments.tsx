import { createFileRoute } from "@tanstack/react-router";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { TreatmentsPanel } from "@/components/portal/treatments/TreatmentsPanel";

export const Route = createFileRoute("/portal/treatments")({
  head: () => ({
    meta: [
      { title: "Treatments | Beema Health" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalTreatmentsPage,
});

function PortalTreatmentsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Treatments"
        subtitle="Your plans, shipments and payments in one place."
      />
      <TreatmentsPanel />
    </div>
  );
}

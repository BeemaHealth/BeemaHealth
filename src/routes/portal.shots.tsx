import { createFileRoute } from "@tanstack/react-router";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { ShotsPanel } from "@/components/portal/shots/ShotsPanel";

export const Route = createFileRoute("/portal/shots")({
  head: () => ({
    meta: [
      { title: "Shots | Beema Health" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalShotsPage,
});

function PortalShotsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PortalPageHeader
        title="Shots"
        subtitle="Log doses, catch up on missed ones and review your history."
      />
      <ShotsPanel />
    </div>
  );
}

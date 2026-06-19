import { createFileRoute } from "@tanstack/react-router";
import { IntakeFlow } from "@/components/intake/IntakeFlow";

export const Route = createFileRoute("/dashboard/intake")({
  component: DashboardIntakePage,
});

function DashboardIntakePage() {
  return <IntakeFlow mode="portal" />;
}

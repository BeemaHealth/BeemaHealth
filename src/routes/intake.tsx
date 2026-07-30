import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { IntakeFlow } from "@/components/intake/IntakeFlow";
import { trackPageViewed } from "@/lib/analytics";

/** In-house intake retired in favor of Bask; component kept dormant, not deleted. */
export const Route = createFileRoute("/intake")({
  ssr: false,
  beforeLoad: async () => {
    throw redirect({ to: "/", replace: true });
  },
  component: IntakeFunnelPage,
});

function IntakeFunnelPage() {
  useEffect(() => {
    trackPageViewed("intake");
  }, []);
  return <IntakeFlow mode="funnel" />;
}

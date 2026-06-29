import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { IntakeFlow } from "@/components/intake/IntakeFlow";
import { requireAuth } from "@/lib/auth";
import { trackPageViewed } from "@/lib/analytics";

export const Route = createFileRoute("/intake")({
  ssr: false,
  beforeLoad: async () => {
    const session = await requireAuth({
      redirectTo: "/qualify",
      redirectPath: "/intake",
    });
    if (!session.user.email_verified)
      throw redirect({ to: "/verify-email/pending" });
  },
  component: IntakeFunnelPage,
});

function IntakeFunnelPage() {
  useEffect(() => {
    trackPageViewed("intake");
  }, []);
  return <IntakeFlow mode="funnel" />;
}

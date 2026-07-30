import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { loadDashboardData } from "@/lib/dashboard-loader";
import type { DashboardData } from "@/lib/types/mvp";

/**
 * In-house patient portal retired — real patient login/dashboard is the
 * Hive portal (see src/lib/cta-ids.ts). Blocking beforeLoad here covers
 * every /dashboard/* child route without touching those files individually;
 * component kept dormant, not deleted.
 */
export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  loader: async (): Promise<DashboardData> => loadDashboardData(),
  component: DashboardLayout,
});

function DashboardLayout() {
  const data = Route.useLoaderData();

  return (
    <PatientPortalLayout data={data}>
      <Outlet />
    </PatientPortalLayout>
  );
}

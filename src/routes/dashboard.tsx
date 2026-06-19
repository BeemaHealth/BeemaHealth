import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { requireAuth } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-loader";
import type { DashboardData } from "@/lib/types/mvp";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await requireAuth({
      redirectTo: "/login",
      redirectPath: location.pathname,
    });
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

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StaffPortalLayout } from "@/components/staff/StaffPortalLayout";
import { requireStaff } from "@/lib/auth";

export const Route = createFileRoute("/staff")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await requireStaff({ redirectPath: location.pathname });
    return { staffUser: session.user };
  },
  component: StaffLayout,
});

function StaffLayout() {
  const { staffUser } = Route.useRouteContext();
  return (
    <StaffPortalLayout user={staffUser}>
      <Outlet />
    </StaffPortalLayout>
  );
}

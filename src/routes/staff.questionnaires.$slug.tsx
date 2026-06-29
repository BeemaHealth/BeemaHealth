import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/questionnaires/$slug")({
  component: () => <Outlet />,
});

import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout shell for /learn and nested educational articles. */
export const Route = createFileRoute("/learn")({
  component: LearnLayout,
});

function LearnLayout() {
  return <Outlet />;
}

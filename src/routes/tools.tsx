import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout shell for /tools and the individual tool pages. */
export const Route = createFileRoute("/tools")({
  component: ToolsLayout,
});

function ToolsLayout() {
  return <Outlet />;
}

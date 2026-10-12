import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AccountTabs } from "@/components/portal/account/AccountTabs";
import {
  parseAccountTab,
  type AccountTab,
} from "@/components/portal/account/account-model";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const Route = createFileRoute("/portal/account")({
  validateSearch: (search: Record<string, unknown>): { tab: AccountTab } => ({
    tab: parseAccountTab(search.tab),
  }),
  head: () => ({
    meta: [
      { title: "Account | Beema Health" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalAccountPage,
});

function PortalAccountPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PortalPageHeader
        title="Account"
        subtitle="Your profile, billing and health information."
      />
      <AccountTabs
        tab={tab}
        onTabChange={(next) =>
          void navigate({ search: { tab: next }, replace: true })
        }
      />
    </div>
  );
}

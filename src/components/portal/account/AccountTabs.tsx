import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingTab } from "./BillingTab";
import { PhiTab } from "./PhiTab";
import { ProfileTab } from "./ProfileTab";
import { parseAccountTab, type AccountTab } from "./account-model";

export function AccountTabs({
  tab,
  onTabChange,
}: {
  tab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
}) {
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(parseAccountTab(v))}
      className="grid gap-5"
    >
      <TabsList className="h-11 w-full justify-start overflow-x-auto rounded-full p-1 sm:w-fit">
        <TabsTrigger value="profile" className="rounded-full">
          Profile
        </TabsTrigger>
        <TabsTrigger value="billing" className="rounded-full">
          Billing and Shipping
        </TabsTrigger>
        <TabsTrigger value="phi" className="rounded-full">
          PHI
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-0">
        <ProfileTab />
      </TabsContent>
      <TabsContent value="billing" className="mt-0">
        <BillingTab />
      </TabsContent>
      <TabsContent value="phi" className="mt-0">
        <PhiTab />
      </TabsContent>
    </Tabs>
  );
}

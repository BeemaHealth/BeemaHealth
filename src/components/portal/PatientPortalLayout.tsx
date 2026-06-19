import type { ReactNode } from "react";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { DashboardData } from "@/lib/types/mvp";

export function PatientPortalLayout({
  data,
  children,
}: {
  data: DashboardData;
  children: ReactNode;
}) {
  return (
    <SidebarProvider className="min-h-svh w-full">
      <PortalSidebar user={data.user} />
      <SidebarInset className="min-h-svh flex-1 bg-background">
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-semibold text-foreground">
            Patient portal
          </span>
        </header>
        <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

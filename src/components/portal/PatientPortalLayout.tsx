import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import type { DashboardData } from "@/lib/types/mvp";

function MobilePortalHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4 md:hidden">
      <Link
        to="/dashboard"
        className="flex min-w-0 shrink items-center"
        aria-label="Beema Health dashboard"
      >
        <Logo className="h-9 w-auto" />
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-xl"
        onClick={toggleSidebar}
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden />
      </Button>
    </header>
  );
}

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
        <MobilePortalHeader />
        <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

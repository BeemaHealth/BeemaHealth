import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { logoutUser } from "@/lib/api/client";
import { STAFF_NAV } from "@/lib/staff-nav";
import type { User } from "@/lib/types/mvp";
import { cn } from "@/lib/utils";

function userInitials(user: User): string {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function StaffSidebar({ user }: { user: User }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar
      side={isMobile ? "right" : "left"}
      className={cn(
        "bg-sidebar",
        isMobile
          ? "border-l border-sidebar-border"
          : "border-r border-sidebar-border",
      )}
    >
      <SidebarHeader className="px-4 py-5">
        {!isMobile && (
          <Link to="/staff" className="flex items-center gap-2">
            <Logo className="h-16 w-auto" />
          </Link>
        )}
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Staff CRM
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="sr-only">
            Staff navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {STAFF_NAV.map((item) => {
                const isActive =
                  item.to === "/staff"
                    ? pathname === "/staff" || pathname === "/staff/"
                    : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-10 rounded-xl px-3"
                    >
                      <Link to={item.to}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            {userInitials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Staff · {user.email}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-xl px-2 text-destructive hover:bg-destructive/10"
            disabled={isLoggingOut}
            onClick={() => {
              if (isLoggingOut) return;
              setIsLoggingOut(true);
              void logoutUser().finally(() => {
                navigate({ to: "/login", search: { redirect: "/staff" } });
                setIsLoggingOut(false);
              });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileStaffHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
      <Link to="/staff" aria-label="Staff dashboard">
        <Logo className="h-9 w-auto" />
      </Link>
      <Button type="button" variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="size-5" />
      </Button>
    </header>
  );
}

export function StaffPortalLayout({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  return (
    <SidebarProvider className="min-h-svh w-full">
      <StaffSidebar user={user} />
      <SidebarInset className="min-h-svh min-w-0 flex-1 bg-background">
        <MobileStaffHeader />
        <div className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

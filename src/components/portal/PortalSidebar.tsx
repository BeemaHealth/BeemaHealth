import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logoutUser } from "@/lib/api/client";
import { getVisiblePortalNav } from "@/lib/portal-nav";
import type { User } from "@/lib/types/mvp";
import { cn } from "@/lib/utils";

function userInitials(user: User): string {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

export function PortalSidebar({ user }: { user: User }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const nav = getVisiblePortalNav();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      if (isMobile) setOpenMobile(false);
      navigate({ to: "/login", search: { redirect: "/dashboard" } });
    } finally {
      setIsLoggingOut(false);
    }
  }

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
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo className="h-16 w-auto" />
          </Link>
        )}
        {isMobile ? (
          <p className="text-sm font-semibold text-foreground">Menu</p>
        ) : (
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Patient portal
          </p>
        )}
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="sr-only">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isActive =
                  item.to === "/dashboard"
                    ? pathname === "/dashboard" || pathname === "/dashboard/"
                    : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-10 rounded-xl px-3",
                        isActive &&
                          "bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
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
              Member · {user.state || "—"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-xl px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            aria-label="Log out"
          >
            <LogOut className="size-4" aria-hidden />
            <span>Log out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

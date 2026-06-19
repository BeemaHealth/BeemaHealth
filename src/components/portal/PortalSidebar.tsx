import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
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
} from "@/components/ui/sidebar";
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
  const nav = getVisiblePortalNav();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-4 py-5">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Logo className="h-16 w-auto" />
        </Link>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Patient portal
        </p>
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
                          "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
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
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            {userInitials(user)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Member · {user.state || "—"}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

import { useRouterState } from "@tanstack/react-router";
import {
  Home,
  MessageCircle,
  Pill,
  Syringe,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { PORTAL_PATHS } from "@/lib/api/portal/home";
import { cn } from "@/lib/utils";
import { PortalLink } from "./PortalLink";

export interface PortalNavItem {
  label: string;
  to: string;
  Icon: LucideIcon;
  /** Exact match only (Home) so it does not light up on every child route. */
  exact?: boolean;
}

export const PORTAL_NAV: PortalNavItem[] = [
  { label: "Home", to: PORTAL_PATHS.home, Icon: Home, exact: true },
  { label: "Chat", to: PORTAL_PATHS.chat, Icon: MessageCircle },
  { label: "Treatments", to: PORTAL_PATHS.treatments, Icon: Pill },
  { label: "Shots", to: PORTAL_PATHS.shots, Icon: Syringe },
];

export function isNavActive(item: PortalNavItem, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return item.exact
    ? path === item.to
    : path === item.to || path.startsWith(`${item.to}/`);
}

/** Desktop left rail. Hidden below the lg breakpoint (BottomNav takes over). */
export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
      <PortalLink
        to={PORTAL_PATHS.home}
        className="mb-8 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        aria-label="Beema Health portal home"
      >
        <Logo className="h-9" />
      </PortalLink>
      <nav aria-label="Portal" className="flex flex-col gap-1">
        {PORTAL_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <PortalLink
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-muted hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="portal-sidebar-active"
                  className="absolute inset-0 rounded-2xl bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <item.Icon className="relative size-[18px]" aria-hidden="true" />
              <span className="relative">{item.label}</span>
            </PortalLink>
          );
        })}
      </nav>
    </aside>
  );
}

/** Mobile bottom navigation, thumb reachable. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Portal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {PORTAL_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <li key={item.to} className="flex-1">
              <PortalLink
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary text-primary-foreground",
                  )}
                >
                  <item.Icon className="size-[18px]" aria-hidden="true" />
                </span>
                {item.label}
              </PortalLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

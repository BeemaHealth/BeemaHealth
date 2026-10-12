import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import type { PortalUser } from "@/lib/api/portal/auth";
import { fetchHome, HOME_QUERY_KEY } from "@/lib/api/portal/home";
import { BottomNav, PORTAL_NAV, Sidebar, isNavActive } from "./Sidebar";
import { TopBar } from "./TopBar";
import { usePortalTheme } from "./ThemeToggle";

/** Page title for the top bar, from the current pathname. */
export function titleForPath(pathname: string): string {
  const match = PORTAL_NAV.find((i) => isNavActive(i, pathname));
  if (match) return match.label;
  if (pathname.startsWith("/portal/account")) return "Account";
  return "Portal";
}

type Props = { user: PortalUser; children: ReactNode };

/** Authenticated chrome: sidebar, top bar, bottom nav and animated page area. */
export function PortalShell({ user, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, setTheme } = usePortalTheme();
  const home = useQuery({
    queryKey: HOME_QUERY_KEY,
    queryFn: fetchHome,
    staleTime: 30_000,
    retry: 1,
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <a
          href="#portal-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar
            title={titleForPath(pathname)}
            user={user}
            items={home.data?.action_items ?? []}
            itemsLoading={home.isLoading}
            theme={theme}
            onThemeChange={setTheme}
          />
          <main
            id="portal-main"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none sm:px-8 lg:pb-12"
          >
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </main>
        </div>
        <BottomNav />
      </div>
    </MotionConfig>
  );
}

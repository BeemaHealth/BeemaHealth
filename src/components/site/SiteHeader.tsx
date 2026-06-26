import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

type NavItem = { label: string; to: string };

const NAV: NavItem[] = [
  { label: "Weight Loss", to: "/weight-loss" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
  { label: "Safety", to: "/safety" },
  { label: "Contact", to: "/contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session, isInitialized } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="veya-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0" aria-label="Aretide home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "text-foreground bg-muted" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:ml-auto lg:flex">
          {!isInitialized ? (
            <div className="h-9 w-24" aria-hidden />
          ) : session ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login" search={{ redirect: "/dashboard" }}>
                Log in
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link to={qualifyHref(CTA_IDS.nav_header)}>See if you qualify</Link>
          </Button>
        </div>

        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88%] max-w-sm">
              <div className="mb-6 mt-2">
                <Logo />
              </div>
              <div className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    to={isInitialized && session ? "/dashboard" : "/login"}
                    search={{ redirect: "/dashboard" }}
                    className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {isInitialized && session ? "Dashboard" : "Log in"}
                  </Link>
                </SheetClose>
              </div>
              <div className="mt-6">
                <SheetClose asChild>
                  <Button asChild size="lg" className="w-full">
                    <Link to={qualifyHref(CTA_IDS.nav_mobile)}>
                      See if you qualify
                    </Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

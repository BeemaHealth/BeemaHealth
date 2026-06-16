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

const NAV = [
  { label: "How it works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "Switch to Aretide", to: "/switch" },
  { label: "Insurance & Pharmacy", to: "/insurance" },
  { label: "Clinicians", to: "/clinicians" },
  { label: "Safety", to: "/safety" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/faq">FAQ</Link>
          </Button>
          <Button asChild>
            <Link to="/qualify">See if you qualify</Link>
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
                    to="/faq"
                    className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    FAQ
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/learn"
                    className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Learn
                  </Link>
                </SheetClose>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <SheetClose asChild>
                  <Button asChild size="lg">
                    <Link to="/qualify">See if you qualify</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/switch">Switch from another provider</Link>
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

import { useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";
import {
  EARLY_ADOPTER_DISCOUNT_SHORT,
  WAITLIST_CTA_LABEL,
} from "@/lib/marketing-copy";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string };

/** Trailing-slash paths — match sitemap.xml / canonicalUrl / GitHub Pages 200 URLs. */
const NAV: NavItem[] = [
  { label: "Weight Loss", to: "/weight-loss/" },
  { label: "How it works", to: "/how-it-works/" },
  // { label: "Pricing", to: "/pricing/" }, // disabled — pricing model not finalized yet
  { label: "FAQ", to: "/faq/" },
  { label: "About", to: "/about/" },
  { label: "Contact", to: "/contact/" },
];

/** Pointy-top hexagon menu trigger — matches HexMotif / logo geometry. */
function HexMenuButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center",
        "transition-opacity hover:opacity-90 active:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 100 112"
        className="absolute inset-0 size-full"
        aria-hidden
        focusable="false"
      >
        <path
          d="M50 4L94 30V82L50 108L6 82V30L50 4Z"
          className="fill-background stroke-primary"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Menu bars — dark on white */}
        <g
          className="stroke-foreground"
          fill="none"
          strokeWidth="5.5"
          strokeLinecap="round"
        >
          <line x1="32" y1="44" x2="68" y2="44" />
          <line x1="32" y1="56" x2="68" y2="56" />
          <line x1="32" y1="68" x2="68" y2="68" />
        </g>
      </svg>
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="veya-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0" aria-label="Beema Health home">
          <Logo className="h-9" />
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

        <div className="hidden items-center gap-3 lg:ml-auto lg:flex">
          {/* Log in / Dashboard link disabled — site in pre-launch waitlist mode */}
          <span className="text-xs font-medium text-muted-foreground">
            {EARLY_ADOPTER_DISCOUNT_SHORT} for early adopters
          </span>
          <Button asChild>
            <Link to={QUALIFY_PATH} search={qualifySearch(CTA_IDS.nav_header)}>
              {WAITLIST_CTA_LABEL}
            </Link>
          </Button>
        </div>

        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <HexMenuButton aria-label="Open menu" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[88%] max-w-sm">
              <div className="mb-6 mt-2">
                <Logo className="h-9" />
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
                {/* Log in / Dashboard link disabled — site in pre-launch waitlist mode */}
              </div>
              <div className="mt-6 space-y-2">
                <SheetClose asChild>
                  <Button asChild size="lg" className="w-full">
                    <Link
                      to={QUALIFY_PATH}
                      search={qualifySearch(CTA_IDS.nav_mobile)}
                    >
                      {WAITLIST_CTA_LABEL}
                    </Link>
                  </Button>
                </SheetClose>
                <p className="text-center text-xs font-medium text-muted-foreground">
                  {EARLY_ADOPTER_DISCOUNT_SHORT} for early adopters
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

import { useRef, useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { EARLY_ADOPTER_DISCOUNT_SHORT } from "@/lib/marketing-copy";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string };

/**
 * Trailing-slash paths — match sitemap.xml / canonicalUrl / GitHub Pages 200
 * URLs. No direct "Weight Loss" link — it's a dropdown label (below) over
 * the per-medication pages, not a page of its own in the clickable nav.
 * /weight-loss/ itself stays live and indexable but unlinked; see
 * public/sitemap.xml.
 */
const NAV: NavItem[] = [
  { label: "How it works", to: "/how-it-works/" },
  // { label: "Pricing", to: "/pricing/" }, // disabled — pricing model not finalized yet
  { label: "FAQ", to: "/faq/" },
  { label: "About", to: "/about/" },
  { label: "Contact", to: "/contact/" },
];

/** "Weight Loss" nav dropdown items. Add branded-medication pages here later. */
const WEIGHT_LOSS_ITEMS: NavItem[] = [
  { label: "Compounded Tirzepatide", to: "/tirzepatide/" },
  { label: "Compounded Semaglutide", to: "/semaglutide/" },
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
  const headerCta = resolveCta(CTA_IDS.nav_header);
  const mobileCta = resolveCta(CTA_IDS.nav_mobile);

  // Hoverable "Weight Loss" dropdown. A single mouseenter/mouseleave pair on
  // the wrapper (not separate ones on trigger + content) is what makes this
  // glitch-free: mouseenter/mouseleave only fire when the pointer crosses
  // the boundary of an element's full DOM subtree, so as long as the menu
  // content renders as a real DOM descendant of the wrapper — not through
  // Radix's default Portal, which would move it out of that subtree and
  // reintroduce the trigger/content hand-off race — moving from the trigger
  // into the content below it never crosses that boundary and never fires a
  // spurious close. That's why DropdownMenuPrimitive.Content is used here
  // directly instead of the shared (portaled) DropdownMenuContent.
  const [weightLossOpen, setWeightLossOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openWeightLossMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setWeightLossOpen(true);
  };
  const closeWeightLossMenuSoon = () => {
    closeTimeoutRef.current = setTimeout(() => setWeightLossOpen(false), 150);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="veya-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0" aria-label="Beema Health home">
          <Logo className="h-9" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseEnter={openWeightLossMenu}
            onMouseLeave={closeWeightLossMenuSoon}
          >
            <DropdownMenu
              open={weightLossOpen}
              onOpenChange={setWeightLossOpen}
            >
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground">
                Weight Loss
                <ChevronDown className="size-3.5" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuPrimitive.Content
                align="start"
                sideOffset={4}
                className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 origin-(--radix-dropdown-menu-content-transform-origin)"
              >
                {WEIGHT_LOSS_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuPrimitive.Content>
            </DropdownMenu>
          </div>
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
            <Link to={headerCta.to} search={headerCta.search}>
              {headerCta.label}
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
                <span className="px-3 py-3 text-base font-semibold text-foreground">
                  Weight Loss
                </span>
                {WEIGHT_LOSS_ITEMS.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      className="rounded-xl px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
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
                    <Link to={mobileCta.to} search={mobileCta.search}>
                      {mobileCta.label}
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

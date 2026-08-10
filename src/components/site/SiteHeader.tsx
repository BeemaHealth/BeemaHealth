import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Hexagon, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { CircleRevealMenu } from "@/components/site/CircleRevealMenu";
import { EASE_OUT } from "@/components/home/home-motion";
import { CTA_IDS, HIVE_LOGIN_URL, resolveCta } from "@/lib/cta-ids";
import { FIRST_MONTH_PROMO_SHORT } from "@/lib/marketing-copy";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "@/lib/contact-info";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string };

/**
 * Trailing-slash paths — match sitemap.xml / canonicalUrl / GitHub Pages 200
 * URLs. "Weight Loss" is a dropdown label (below) over the program overview
 * plus the per-medication pages, see docs/features/treatment-pages.md.
 */
const NAV: NavItem[] = [
  { label: "How it works", to: "/how-it-works/" },
  // { label: "Pricing", to: "/pricing/" }, // disabled - pricing model not finalized yet
  { label: "FAQ", to: "/faq/" },
  { label: "About", to: "/about/" },
  { label: "Contact", to: "/contact/" },
];

/** "Weight Loss" nav dropdown items. Add branded-medication pages here later. */
const WEIGHT_LOSS_ITEMS: NavItem[] = [
  { label: "Weight Loss Program", to: "/weight-loss/" },
  { label: "Compounded Tirzepatide", to: "/tirzepatide/" },
  { label: "Compounded Semaglutide", to: "/semaglutide/" },
];

/**
 * Plain, hand-rolled hover dropdown — deliberately not built on Radix's
 * DropdownMenu. That component is designed for click/keyboard menus: its
 * Popper positioning recalculates on every layout tick and its open/close
 * animation resizes the content for ~150ms after opening, both of which
 * move the menu's hit-box out from under a stationary cursor and caused a
 * persistent open/close flicker. This version has no portal, no animation,
 * and no dynamic positioning — the menu is a plain absolutely-positioned
 * child of the trigger's own wrapper, so there is nothing that can shift
 * under the cursor while it's open.
 */
function WeightLossNavDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setOpen(true);
  };
  const closeMenuSoon = () => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  // Click-outside + Escape close it when opened via click/keyboard rather
  // than hover (hover already closes itself via onMouseLeave above).
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuSoon}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-muted aria-expanded:text-foreground"
      >
        Weight Loss
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden whitespace-nowrap rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {WEIGHT_LOSS_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-sm px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mobile-menu equivalent of `WeightLossNavDropdown` — a tap-to-expand
 * disclosure instead of a hover dropdown, since there's no hover on touch.
 * Local `expanded` state so it collapses back down each time the mobile
 * menu itself is reopened, rather than persisting open across visits.
 */
function MobileWeightLossDropdown({ onNavigate }: { onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between rounded-xl px-1 py-2.5 text-xl font-semibold text-ink-foreground transition-colors hover:text-primary"
      >
        Weight Loss
        <ChevronDown
          className={cn(
            "size-5 shrink-0 transition-transform duration-300 ease-out",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="weight-loss-links"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pb-1 pl-3">
              {WEIGHT_LOSS_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className="rounded-xl px-1 py-2 text-base font-medium text-ink-foreground/75 transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialIconRow({
  linkClassName = "text-muted-foreground transition-all hover:scale-110 hover:text-foreground",
  iconClassName = "size-4",
}: {
  linkClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {SOCIAL_LINKS.map(({ label, href, Icon, colorClassName }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Beema Health on ${label}`}
          className={cn(linkClassName, colorClassName)}
        >
          <Icon className={iconClassName} />
        </a>
      ))}
    </div>
  );
}

/** Login link to the Hive patient portal — a separate app, so a plain anchor rather than a router `<Link>`. */
function HiveLoginLink({ className }: { className?: string }) {
  return (
    <a
      href={HIVE_LOGIN_URL}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 hover:shadow-lift",
        className,
      )}
    >
      Log In
      <Hexagon className="size-4 text-background" aria-hidden />
    </a>
  );
}

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
  const mobileCta = resolveCta(CTA_IDS.nav_mobile);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="veya-container flex h-16 items-center justify-between gap-4">
        {/* Desktop lockup — mobile gets its own centered, stacked lockup below. */}
        <Link
          to="/"
          className="hidden shrink-0 lg:block"
          aria-label="Beema Health home"
        >
          <Logo className="h-9" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <WeightLossNavDropdown />
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "text-foreground bg-muted" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:ml-auto lg:flex">
          {/* Promo line lives in the hero, marquee, and mobile menu —
              dropped here so phone + socials have room without wrapping
              (veya-container caps at 1200px; there isn't space for all five). */}
          <div className="hidden items-center gap-4 border-r border-border pr-4 xl:flex">
            <a
              href={SUPPORT_PHONE_HREF}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="size-4 text-success" aria-hidden />
              {SUPPORT_PHONE_DISPLAY}
            </a>
            <SocialIconRow />
          </div>

          <HiveLoginLink />
        </div>

        {/* Mobile header: hamburger left, centered stacked lockup, phone button right. */}
        <div className="relative flex w-full items-center justify-between lg:hidden">
          <CircleRevealMenu
            open={open}
            onOpenChange={setOpen}
            trigger={<HexMenuButton aria-label="Open menu" />}
          >
            <div className="mb-2 mt-8 px-8">
              <Logo tone="ink" className="h-9" />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1 px-8">
              <MobileWeightLossDropdown onNavigate={() => setOpen(false)} />
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-1 py-2.5 text-xl font-semibold text-ink-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={HIVE_LOGIN_URL}
                className="mt-2 flex items-center justify-center gap-2 rounded-full border-2 border-primary px-4 py-3 text-lg font-semibold text-ink-foreground transition-colors hover:bg-primary/10"
              >
                Log In
                <Hexagon className="size-5 text-primary" aria-hidden />
              </a>
            </div>
            <div className="space-y-4 px-8 pb-8">
              <Button asChild size="lg" className="w-full">
                <Link
                  to={mobileCta.to}
                  search={mobileCta.search}
                  onClick={() => {
                    mobileCta.onClick();
                    setOpen(false);
                  }}
                >
                  {mobileCta.label}
                </Link>
              </Button>
              <p className="text-center text-xs font-medium text-ink-foreground/60">
                {FIRST_MONTH_PROMO_SHORT}
              </p>
              <div className="flex items-center justify-between border-t border-ink-foreground/15 pt-4">
                <a
                  href={SUPPORT_PHONE_HREF}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-foreground"
                >
                  <Phone className="size-4 text-success" aria-hidden />
                  {SUPPORT_PHONE_DISPLAY}
                </a>
                <div className="flex items-center gap-4">
                  {SOCIAL_LINKS.map(({ label, href, Icon, colorClassName }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Beema Health on ${label}`}
                      className={cn(
                        "text-ink-foreground/70 transition-all hover:scale-110 hover:text-ink-foreground",
                        colorClassName,
                      )}
                    >
                      <Icon className="size-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </CircleRevealMenu>

          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2"
            aria-label="Beema Health home"
          >
            <Logo stacked className="h-7" />
          </Link>

          <a
            href={SUPPORT_PHONE_HREF}
            aria-label={`Call Beema Health at ${SUPPORT_PHONE_DISPLAY}`}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            <Phone className="size-5" aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}

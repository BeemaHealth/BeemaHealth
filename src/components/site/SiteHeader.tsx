import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Hexagon, Phone } from "lucide-react";
import { Logo, HeaderLogo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { CircleRevealMenu } from "@/components/site/CircleRevealMenu";
import { EASE_OUT } from "@/components/home/home-motion";
import { HIVE_LOGIN_URL } from "@/lib/cta-ids";
import { FIRST_MONTH_PROMO_SHORT } from "@/lib/marketing-copy";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "@/lib/contact-info";
import { RECIPES } from "@/lib/recipes";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; description?: string };
/** Two-column grouping for a dropdown (e.g. Hair's For Men / For Women). */
type NavSection = { heading: string; items: readonly NavItem[] };

/**
 * Trailing-slash paths - match sitemap.xml / canonicalUrl / GitHub Pages 200
 * URLs. Primary nav is four dropdowns: Weight Loss, Sexual Health, Hair, and
 * More. See docs/features/treatment-pages.md.
 */
const NAV: NavItem[] = [
  // { label: "Pricing", to: "/pricing/" }, // disabled - pricing model not finalized yet
];

/**
 * ---------------------------------------------------------------------
 * Treatment dropdowns (2026-08-27: reorganized by category, Good Life Meds
 * style, replacing the earlier flat `TREATMENT_ITEMS` list)
 * ---------------------------------------------------------------------
 * Each category dropdown lists that category's individual medication pages
 * only - the category's own overview/hub page (`/weight-loss`,
 * `/sexual-health`, `/hair`) stays out of the header and lives in the
 * footer Care column instead, matching the pre-existing `/weight-loss`
 * convention. See docs/features/treatment-pages.md.
 */
const WEIGHT_LOSS_ITEMS: NavItem[] = [
  { label: "Compounded Tirzepatide", to: "/tirzepatide/" },
  { label: "Compounded Semaglutide", to: "/semaglutide/" },
];

/**
 * TRT is paused (2026-08-28) - Beema is not selling it, so it's out of the
 * nav entirely for now (not even commented items, since a disabled link
 * inside a live dropdown is confusing). When it returns, it goes back here
 * (same audience/purchase journey as ED) - see docs/features/
 * treatment-pages.md for the pause and the "don't call it TRT" naming rule.
 * Money-page architecture (2026-09-03): nav links go straight to each
 * product's own dedicated landing page (tadalafil.tsx, sildenafil.tsx,
 * ed-mints.tsx - each with its own confirmed Bask intake CTA), never through
 * an intermediate page first. /ed stays live as a broader comparison/
 * overview page (like /weight-loss) that links onward to these - it's
 * reachable from the footer and in-page cross-links, not from this nav.
 * See docs/features/treatment-pages.md.
 *
 * Sectioned For Men / For Women like Hair (2026-08-29), but only "For Men"
 * has items today - women's ED/sexual-health products are coming soon but
 * don't exist yet, so there's no "For Women" section to show. Add it (same
 * shape as HAIR_SECTIONS) once a women's product actually ships - don't add
 * an empty/coming-soon section header before then.
 */
const SEXUAL_HEALTH_SECTIONS: NavSection[] = [
  {
    heading: "For Men",
    items: [
      { label: "Oral Tadalafil", to: "/tadalafil/" },
      { label: "Oral Sildenafil", to: "/sildenafil/" },
      { label: "ED Mints", to: "/ed-mints/" },
    ],
  },
];

/**
 * Sectioned For Men / For Women, Good Life Meds style (screenshot ref in
 * conversation, 2026-08-28) - all 6 items originally lived on the one
 * /hairloss page, organized into Men/Women sections there too.
 * /hairloss was merged into /hair-loss (the hub) on 2026-09-04 - see below.
 *
 * Oral Minoxidil and both sexes' Hair Loss Spray launched 2026-09-09 (Matt),
 * each on its own dedicated money page with its own confirmed Bask intake
 * CTA - see cta-ids.ts. Oral Minoxidil is one product/one price/one Bask
 * questionnaire for both sexes, but per Matt (2026-09-09) it still gets two
 * separate landing pages - `/oral-minoxidil-men` and
 * `/oral-minoxidil-women` - rather than one shared page, so each sex's copy
 * never mentions the other's product. "Oral Hair Compound" (women's, a
 * distinct formulation from oral minoxidil - HAIRLOSS_WOMENS_COMPOUND_PRICING
 * in simple-treatment-pricing.ts) is NOT part of this launch and stays out of
 * both nav and hair-loss.tsx's LINEUP pending its own launch decision - do
 * not add it here without a separate go-ahead.
 *
 * Money-page architecture: links straight to each dedicated landing page
 * (its own confirmed Bask intake CTA), not through /hair-loss first -
 * /hair-loss stays live as the category hub, reachable from the footer, not
 * this nav.
 */
const HAIR_SECTIONS: NavSection[] = [
  {
    heading: "For Men",
    items: [
      { label: "Oral Minoxidil", to: "/oral-minoxidil-men/" },
      { label: "Oral Finasteride", to: "/oral-finasteride/" },
      { label: "Hair Loss Spray", to: "/hair-loss-spray-men/" },
    ],
  },
  {
    heading: "For Women",
    items: [
      { label: "Oral Minoxidil", to: "/oral-minoxidil-women/" },
      { label: "Hair Loss Spray", to: "/hair-loss-spray-women/" },
    ],
  },
];

/**
 * Free content library, the care-process overview, and the company cluster
 * (About/FAQ/Contact), combined into one "More" dropdown (2026-08-27) so the
 * 4 treatment-category dropdowns (Weight Loss / Sexual Health / Hair /
 * Wellness) can stay the header's "main groups" without competing for space
 * against 2 more utility dropdowns. Previously two separate dropdowns
 * (`RESOURCE_ITEMS` / "Resources" and `ABOUT_ITEMS` / "About") - merged, not
 * removed, so every item here is still one click away from any page. The
 * footer's separate Resources and Trust columns are untouched.
 *
 * Do not brand this dropdown - keep the label literal ("More") so it does
 * not compete with Hive (the patient portal at hive.beemahealth.com). Add
 * new no-account resource hubs here and in SiteFooter COLUMNS.
 */
const MORE_ITEMS: NavItem[] = [
  {
    label: "How it works",
    to: "/how-it-works/",
    description: "Intake, review, and delivery",
  },
  {
    label: "Recipes",
    to: "/recipes/",
    description: `${RECIPES.length} meals for changing appetites`,
  },
  {
    label: "Learn",
    to: "/learn/",
    description: "GLP-1 and hormone education",
  },
  { label: "About us", to: "/about/" },
  { label: "FAQ", to: "/faq/" },
  { label: "Contact us", to: "/contact/" },
];

/**
 * Desktop nav dropdowns - click to open (Good Life Meds pattern), hover to
 * switch once one is open, fade/slide the panel. Animate opacity + translate
 * only; do not use Radix DropdownMenu (its Popper repositioning caused a
 * persistent open/close flicker). Shared `openId` so only one panel is open.
 */
function DesktopNav() {
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  const cancelTimers = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  };

  const openMenu = (id: string, immediate = false) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (immediate || openId !== null) {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
      setOpenId(id);
      return;
    }
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => setOpenId(id), 70);
  };

  const closeMenuSoon = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setOpenId(null), 180);
  };

  const closeMenuNow = () => {
    cancelTimers();
    setOpenId(null);
  };

  useEffect(() => {
    if (!openId) return;
    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        cancelTimers();
        setOpenId(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        cancelTimers();
        setOpenId(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openId]);

  useEffect(() => {
    return () => cancelTimers();
  }, []);

  const menus = [
    { id: "weight-loss", label: "Weight Loss", items: WEIGHT_LOSS_ITEMS },
    {
      id: "sexual-health",
      label: "Sexual Health",
      sections: SEXUAL_HEALTH_SECTIONS,
    },
    { id: "hair", label: "Hair Loss", sections: HAIR_SECTIONS },
    { id: "more", label: "More", items: MORE_ITEMS },
  ] as const;

  return (
    <nav
      ref={navRef}
      className="hidden items-center gap-1 lg:flex"
      onMouseLeave={closeMenuSoon}
    >
      {menus.map((menu) => (
        <DesktopNavDropdown
          key={menu.id}
          id={menu.id}
          label={menu.label}
          items={"items" in menu ? menu.items : undefined}
          sections={"sections" in menu ? menu.sections : undefined}
          open={openId === menu.id}
          dimmed={openId !== null && openId !== menu.id}
          reduceMotion={!!reduceMotion}
          onOpen={() => openMenu(menu.id)}
          onToggle={() =>
            openId === menu.id ? closeMenuNow() : openMenu(menu.id, true)
          }
        />
      ))}
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
  );
}

function DesktopNavDropdown({
  id,
  label,
  items,
  sections,
  footerItems,
  open,
  dimmed,
  reduceMotion,
  onOpen,
  onToggle,
}: {
  id: string;
  label: string;
  /** Flat item list. Ignored when `sections` is set. */
  items?: readonly NavItem[];
  /** Two-column For Men / For Women style grouping - see HAIR_SECTIONS. */
  sections?: readonly NavSection[];
  footerItems?: readonly NavItem[];
  open: boolean;
  dimmed: boolean;
  reduceMotion: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const flatItems = items ?? [];
  const hasDescriptions = flatItems.some((item) => item.description);
  const menuId = `${id}-menu`;

  return (
    <div className="relative" onMouseEnter={onOpen}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={onToggle}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-[color,background-color,opacity] duration-200 ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open
            ? "bg-muted text-foreground"
            : dimmed
              ? "text-muted-foreground/50 hover:text-foreground"
              : "text-muted-foreground",
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{
              duration: reduceMotion ? 0 : 0.28,
              ease: EASE_OUT,
            }}
            className={cn(
              "absolute left-0 top-full z-50 pt-2",
              sections
                ? sections.length > 1
                  ? "min-w-[24rem]"
                  : "min-w-[14rem]"
                : hasDescriptions
                  ? "min-w-[16rem]"
                  : "min-w-[14rem]",
            )}
          >
            <div className="overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-soft">
              {sections ? (
                <div
                  className={cn(
                    "grid gap-1",
                    sections.length > 1 ? "grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {sections.map((section) => (
                    <div key={section.heading}>
                      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.heading}
                      </p>
                      {section.items.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          role="menuitem"
                          className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
                          onClick={onToggle}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                flatItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    role="menuitem"
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                      !hasDescriptions && "whitespace-nowrap",
                    )}
                    onClick={onToggle}
                  >
                    {item.label}
                    {item.description ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </Link>
                ))
              )}
              {footerItems && footerItems.length > 0 ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2">
                  {footerItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      className="inline-flex min-h-8 items-center text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:text-foreground"
                      onClick={onToggle}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Mobile-menu equivalent of `DesktopNavDropdown` - a tap-to-expand
 * disclosure instead of a hover dropdown, since there's no hover on touch.
 * Local `expanded` state so it collapses back down each time the mobile
 * menu itself is reopened, rather than persisting open across visits.
 */
function MobileNavDropdown({
  label,
  items,
  sections,
  footerItems,
  onNavigate,
}: {
  label: string;
  items?: readonly NavItem[];
  sections?: readonly NavSection[];
  footerItems?: readonly NavItem[];
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelKey = `${label.toLowerCase().replace(/\s+/g, "-")}-links`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-1 py-2.5 text-xl font-semibold text-ink-foreground transition-colors hover:text-primary"
      >
        {label}
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
            key={panelKey}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pb-1 pl-3">
              {sections
                ? sections.map((section) => (
                    <div key={section.heading} className="mb-2">
                      <p className="px-1 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-foreground/50">
                        {section.heading}
                      </p>
                      {section.items.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={onNavigate}
                          className="block rounded-xl px-1 py-2 text-base font-medium text-ink-foreground/75 transition-colors hover:text-primary"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))
                : (items ?? []).map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={onNavigate}
                      className="rounded-xl px-1 py-2 text-base font-medium text-ink-foreground/75 transition-colors hover:text-primary"
                    >
                      {item.label}
                      {item.description ? (
                        <span className="mt-0.5 block text-sm font-normal text-ink-foreground/55">
                          {item.description}
                        </span>
                      ) : null}
                    </Link>
                  ))}
              {footerItems && footerItems.length > 0 ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-foreground/15 pt-2">
                  {footerItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className="py-1 text-sm text-ink-foreground/55 transition-colors hover:text-ink-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
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

/** Login link to the Hive patient portal - a separate app, so a plain anchor rather than a router `<Link>`. */
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

/** Pointy-top hexagon menu trigger - matches HexMotif / logo geometry. */
function HexMenuButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group relative flex size-11 shrink-0 cursor-pointer items-center justify-center",
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
          className="fill-background stroke-primary transition-colors group-hover:fill-muted"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Menu bars - dark on white */}
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
        {/* Desktop lockup - mobile gets its own centered, stacked lockup below. */}
        <Link
          to="/"
          className="hidden shrink-0 lg:block"
          aria-label="Beema Health home"
        >
          <HeaderLogo className="h-9" />
        </Link>

        <DesktopNav />

        <div className="hidden items-center gap-4 lg:ml-auto lg:flex">
          {/* Promo line lives in the hero, marquee, and mobile menu - 
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
              <span className="inline-flex rounded-lg bg-background px-3 py-2">
                <HeaderLogo className="h-9" />
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1 px-8">
              <MobileNavDropdown
                label="Weight Loss"
                items={WEIGHT_LOSS_ITEMS}
                onNavigate={() => setOpen(false)}
              />
              <MobileNavDropdown
                label="Sexual Health"
                sections={SEXUAL_HEALTH_SECTIONS}
                onNavigate={() => setOpen(false)}
              />
              <MobileNavDropdown
                label="Hair Loss"
                sections={HAIR_SECTIONS}
                onNavigate={() => setOpen(false)}
              />
              <MobileNavDropdown
                label="More"
                items={MORE_ITEMS}
                onNavigate={() => setOpen(false)}
              />
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
            </div>
            <div className="space-y-4 px-8 pb-8">
              <Button asChild size="lg" className="w-full">
                <a href={HIVE_LOGIN_URL}>
                  Log In
                  <Hexagon className="size-5 text-background" aria-hidden />
                </a>
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

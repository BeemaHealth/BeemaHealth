import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeDollarSign,
  HeartPulse,
  Lock,
  Pill,
  Scale,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import {
  FloatingHexagons,
  HoverLiftButton,
} from "@/components/site/primitives";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GetStartedModal } from "@/components/site/GetStartedModal";
import {
  GOOGLE_BUSINESS_LISTING_URL,
  GOOGLE_RATING_VALUE,
} from "@/lib/google-business";
import {
  EASE_OUT,
  LineReveal,
  RotatingBadge,
} from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import {
  HERO_BADGE_MESSAGES,
  HERO_MARQUEE_OFFERING_LINE,
  HOME_HERO_ALSO,
  HOME_HERO_INTRO,
  HOME_HERO_OFFERINGS,
  type HomeHeroOfferingId,
} from "@/lib/home-hero";
import { dualCompoundedPromoShortPricingLine } from "@/lib/medication-pricing";
import heroImg from "@/assets/hero.jpg";

const OFFERING_ICONS: Record<HomeHeroOfferingId, LucideIcon> = {
  "weight-loss": Scale,
  ed: HeartPulse,
};

/**
 * Four static trust points in the dark band anchored to the hero's bottom
 * edge. No rotation or scrolling: all four are always visible.
 */
const HERO_BAR_ITEMS: readonly {
  icon: LucideIcon;
  label: string;
  /** Hidden below lg so phones show a single row of two. */
  desktopOnly?: boolean;
}[] = [
  { icon: ShieldCheck, label: HERO_MARQUEE_OFFERING_LINE },
  { icon: BadgeDollarSign, label: dualCompoundedPromoShortPricingLine() },
  { icon: Pill, label: "USA licensed pharmacies", desktopOnly: true },
  {
    icon: Lock,
    label: "Private & secure encrypted intake",
    desktopOnly: true,
  },
];

/**
 * Staggered fade-up entrance for the eyebrow/paragraph/CTA column.
 * `delayChildren` is tuned to pick up roughly where the headline's masked
 * line reveals leave off, so the column cascades in right after the
 * headline rather than racing it. Durations collapse to 0 (and the initial
 * offset to 0) under reduced motion.
 */
function useHeroColumnStagger(reduceMotion: boolean) {
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.12,
        delayChildren: reduceMotion ? 0 : 0.6,
      },
    },
  };
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT },
    },
  };
  return { container, item };
}

/**
 * Full-viewport cinematic hero for the homepage redesign. Two-column on
 * lg (headline column left, hexagon-clipped photography right), with a
 * scroll-linked parallax split between the columns for depth, and a
 * static four-item trust bar anchored to its bottom edge.
 *
 * The lg min-height is deliberately `calc(100svh-4rem)` rather than a full
 * `100svh` - that headroom is what keeps the fixed site header from pushing
 * the CTA row and scroll cue below the fold on laptop-height windows
 * (~1280x700 after browser chrome). Vertical rhythm (margin-top and
 * padding-y utilities) and the headline's fluid clamp() size are tuned
 * against that same budget. It's capped at 50rem (800px) via `min()` so it
 * stops growing past that on very tall/large monitors - uncapped, the
 * content (vertically centered in the grid) ended up stranded in a wall of
 * empty space above and below on e.g. 1600px+-tall viewports.
 *
 * The trust bar (`HERO_BAR_ITEMS`) is absolutely positioned at the bottom of
 * the hero section on lg, so it sits at the hero's own edge rather than floating
 * over later content. The content grid's bottom padding reserves room for it
 * on lg only. Below lg the bar is an in-flow 1x2 row (the first two items) under the content, so
 * it never covers the hexagon photo or the CTA row.
 */
export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const { container, item } = useHeroColumnStagger(Boolean(reduceMotion));
  const [getStartedOpen, setGetStartedOpen] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const headlineY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -60],
  );
  const headlineOpacity = useTransform(
    scrollYProgress,
    [0, 1],
    [1, reduceMotion ? 1 : 0.3],
  );
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : 40],
  );
  const imageScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, reduceMotion ? 1 : 1.06],
  );
  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-grad-hero lg:min-h-[min(calc(100svh-4rem),50rem)]"
    >
      <GetStartedModal open={getStartedOpen} onOpenChange={setGetStartedOpen} />
      <div
        aria-hidden
        className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
      />
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
      />
      <FloatingHexagons className="z-0" />

      <div className="veya-container relative z-10 grid min-h-0 items-center gap-10 py-10 pb-12 md:py-12 md:pb-14 lg:min-h-[min(calc(100svh-4rem),50rem)] lg:grid-cols-2 lg:gap-16 lg:py-14 lg:pb-24 xl:gap-20">
        <motion.div
          className="relative z-10"
          initial="hidden"
          animate="show"
          variants={container}
          style={
            reduceMotion
              ? undefined
              : { y: headlineY, opacity: headlineOpacity }
          }
        >
          <motion.div variants={item}>
            <RotatingBadge messages={HERO_BADGE_MESSAGES} interval={4000} />
          </motion.div>

          {/*
              Seal stays top-right; float (not a rigid 2/3+1/3 grid) so the
              headline keeps most of the column width and only tucks beside
              the seal for the first lines. A full-width 1/3 column had been
              stretching the seal and forcing the LineReveal blocks into a
              narrow stack.
            */}
          <div className="mt-3">
            <LegitScriptSeal className="float-right ml-3 mb-1 w-[5.75rem] [&_img]:h-auto [&_img]:w-full sm:w-24" />
            <h1 className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.1] tracking-tight text-foreground">
              <LineReveal delay={0}>
                {"Online weight-loss and ED care "}
              </LineReveal>
              <LineReveal delay={0.1}>
                {"that's "}
                <span className="text-grad-brand">human</span>
                {" and "}
              </LineReveal>
              <LineReveal delay={0.2}>
                {"built for "}
                <span className="text-grad-brand">success.</span>
              </LineReveal>
            </h1>
            <div className="clear-both" />
          </div>

          {/*
              LCP-critical: this is the largest text block painted on initial
              load. A prior version gave it a fast (duration:0.4, delay:0.05)
              opacity fade instead of the column's full stagger - but Lighthouse
              still measured it as render-delayed, because ANY Motion-driven
              opacity transition can't start until the Motion library's JS has
              hydrated, so the delay isn't really about duration, it's about
              waiting on JS at all. Rendered as a plain, unanimated <p> instead
              (same fix that worked for safety.tsx) so it paints as part of the
              server-rendered HTML/CSS with zero JS dependency.
            */}
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:max-w-2xl">
            {HOME_HERO_INTRO}
          </p>

          <ul className="mt-5 grid list-none gap-3 p-0 sm:grid-cols-2">
            {HOME_HERO_OFFERINGS.map((offering) => {
              const Icon = OFFERING_ICONS[offering.id];
              return (
                <li key={offering.id}>
                  <Link
                    to={offering.to}
                    className="group flex h-full min-h-11 items-center gap-3 rounded-2xl border border-border bg-background/95 px-3.5 py-3 shadow-soft transition-colors hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {offering.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {offering.detail}
                      </span>
                    </span>
                    <ArrowRight
                      className="ml-auto size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Also{" "}
            {HOME_HERO_ALSO.map((item, index) => {
              const separator =
                index === 0
                  ? null
                  : index === HOME_HERO_ALSO.length - 1
                    ? ", and "
                    : ", ";
              return (
                <span key={item.to}>
                  {separator}
                  <Link
                    to={item.to}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                </span>
              );
            })}
            .
          </p>

          <motion.div
            variants={item}
            className="mt-6 flex flex-col items-start gap-3"
          >
            {/*
                Trust badge before the CTA, not after - proof precedes the
                ask. A pill (not bare inline text) so it reads as a badge
                rather than an orphaned caption under the button, and its own
                gap-3 gives it room to breathe above the button at every
                width instead of crowding it on mobile.

                Star rendering (2026-09-24, per Matt's screenshot feedback):
                lucide's default strokeWidth (2) is tuned for line-only
                icons, not a filled shape - at size-4 with a mid-tone stroke
                it blurred into a muddy blob instead of a crisp star. A
                thinner (1.5) near-black outline around the bright primary
                fill reads like a real badge glyph (the classic
                outlined-emoji-star look) instead of two similar warm tones
                fighting each other.
              */}
            <a
              href={GOOGLE_BUSINESS_LISTING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-soft ring-1 ring-border/60 transition-colors hover:bg-muted"
            >
              <span aria-hidden className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    strokeWidth={1.5}
                    className="size-5 fill-primary stroke-foreground"
                  />
                ))}
              </span>
              {GOOGLE_RATING_VALUE} on Google
            </a>
            <HoverLiftButton>
              <Button
                type="button"
                size="xl"
                onClick={() => setGetStartedOpen(true)}
              >
                Get Started <ArrowRight />
              </Button>
            </HoverLiftButton>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative z-10 mx-auto w-full max-w-md lg:w-fit lg:max-w-none"
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 1.1,
            ease: EASE_OUT,
            delay: reduceMotion ? 0 : 0.35,
          }}
        >
          <motion.div
            className="clip-hex relative aspect-[100/112] w-full overflow-hidden bg-ink lg:h-[min(62vh,520px)] lg:w-auto xl:h-[min(68vh,580px)]"
            style={reduceMotion ? undefined : { y: imageY, scale: imageScale }}
          >
            <img
              src={heroImg}
              alt="A calm, bright kitchen with fresh vegetables and a glass of water"
              width={1280}
              height={1024}
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/10 to-transparent"
            />
            <div className="absolute inset-x-0 top-[24%] px-8 text-left md:px-12">
              <p className="text-sm font-semibold text-ink-foreground">
                Compassionate medical care
              </p>
              <p className="mt-1 text-xs text-ink-foreground/80">
                From first contact to long-term success
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="bg-grad-ink relative z-30 text-ink-foreground lg:absolute lg:inset-x-0 lg:bottom-0">
        <ul className="veya-container grid grid-cols-2 lg:grid-cols-4">
          {HERO_BAR_ITEMS.map(({ icon: Icon, label, desktopOnly }) => (
            <li
              key={label}
              className={`flex-col items-center justify-center gap-2 border-ink-foreground/15 px-3 py-5 text-center text-[11px] font-semibold uppercase leading-snug tracking-wide max-lg:odd:border-r sm:text-xs lg:flex lg:flex-row lg:gap-3 lg:border-r lg:py-5 lg:last:border-r-0 ${desktopOnly ? "hidden" : "flex"}`}
            >
              <Icon
                className="size-6 shrink-0 text-primary lg:size-5"
                aria-hidden
              />
              <span className="text-balance">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

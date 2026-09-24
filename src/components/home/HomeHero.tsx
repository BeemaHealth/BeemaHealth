import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import {
  FloatingHexagons,
  HexMotif,
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
  Marquee,
  RotatingBadge,
} from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FIRST_MONTH_PROMO_LINE,
  FIRST_MONTH_PROMO_SHORT,
} from "@/lib/marketing-copy";
import {
  dualCompoundedHomeHeroTeaser,
  dualCompoundedPromoShortPricingLine,
} from "@/lib/medication-pricing";
import heroImg from "@/assets/hero.jpg";

/** Hero badge rotation - reuses the same approved trust claims shown elsewhere on this page (marquee ticker, promo line) rather than inventing new copy. */
const HERO_BADGE_MESSAGES = [
  "GLP-1 weight-loss care",
  "Licensed USA physician network",
  "USA 503A pharmacies",
  FIRST_MONTH_PROMO_SHORT,
] as const;

const MARQUEE_ITEMS = [
  "Licensed providers",
  dualCompoundedPromoShortPricingLine(),
  "USA licensed pharmacies",
  "Private & secure encrypted intake",
  "HIPAA-compliant care",
  FIRST_MONTH_PROMO_LINE,
  "Self-paced online intake",
] as const;

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
 * full-width infinite marquee band anchored to its bottom edge.
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
 * The marquee band (replacing the old animated "Scroll" cue in that same
 * spot) is viewport-fixed rather than positioned against the hero section's
 * own box - the headline's fluid clamp() can wrap to extra lines at some
 * widths, which grows the section past its `100svh-4rem` target, so
 * anchoring the marquee to the section's bottom edge would just push it
 * off-screen again along with that overflow. Fixing it to the viewport
 * guarantees it's visible on initial load regardless of hero content
 * height, and it fades out (`marqueeOpacity`) over the first slice of hero
 * scroll so it doesn't linger fixed over content further down the page.
 * The content grid's bottom padding (`pb-20`/`pb-24`) reserves room so the
 * CTA row doesn't render underneath it on load.
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
  // The marquee is viewport-fixed (not tied to the hero section's own,
  // content-dependent height) so it's guaranteed visible on initial load
  // regardless of how tall the headline wraps at a given width. This fades
  // it out over the first slice of hero scroll so it doesn't linger fixed
  // over content further down the page.
  const marqueeOpacity = useTransform(
    scrollYProgress,
    [0, 0.12],
    [1, reduceMotion ? 1 : 0],
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

      <div className="veya-container relative z-10 grid min-h-0 items-center gap-10 py-10 pb-20 md:py-12 md:pb-24 lg:min-h-[min(calc(100svh-4rem),50rem)] lg:grid-cols-2 lg:gap-16 lg:py-14 lg:pb-24 xl:gap-20">
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
              <LineReveal delay={0}>Online care</LineReveal>
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
            USA physicians, licensed and certified USA 503A pharmacies,{" "}
            {dualCompoundedHomeHeroTeaser()}.
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

        {/*
            Bottom-right pill, separate from the Get Started button above so
            it doesn't read as a second/third CTA option (per Matt, the old
            Tirzepatide/Semaglutide button row next to Get Started made the
            primary CTA look weight-loss-only). Sits in the grid's reserved
            pb-20/pb-24 bottom padding, same headroom that keeps the fixed
            marquee band from covering it.
          */}
        <motion.div
          className="absolute bottom-4 right-0 z-20 hidden sm:bottom-6 sm:block"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            ease: EASE_OUT,
            delay: reduceMotion ? 0 : 1.1,
          }}
        >
          <Link
            to="/tirzepatide/"
            className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-4 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-background sm:text-sm"
          >
            <span className="text-muted-foreground">Most popular:</span>
            <span>Tirzepatide</span>
            <span className="inline-flex items-center gap-1 text-primary">
              See pricing
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        className={cn(
          "inset-x-0 bottom-0 z-30 bg-grad-ink py-4 text-ink-foreground md:py-5",
          reduceMotion ? "absolute" : "fixed pointer-events-none",
        )}
        style={reduceMotion ? undefined : { opacity: marqueeOpacity }}
      >
        <Marquee duration={30}>
          {MARQUEE_ITEMS.map((label) => (
            <span
              key={label}
              className="flex shrink-0 items-center gap-8 whitespace-nowrap text-sm font-semibold uppercase tracking-wide sm:gap-10"
            >
              {label}
              <HexMotif className="size-3 shrink-0 text-primary" />
            </span>
          ))}
        </Marquee>
      </motion.div>
    </section>
  );
}

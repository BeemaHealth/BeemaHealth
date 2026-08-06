import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import {
  FloatingHexagons,
  HexMotif,
  MagneticButton,
} from "@/components/site/primitives";
import {
  EASE_OUT,
  LineReveal,
  Marquee,
  RotatingBadge,
} from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { cn } from "@/lib/utils";
import {
  FIRST_MONTH_PROMO_LINE,
  FIRST_MONTH_PROMO_SHORT,
  promoIncentiveLine,
} from "@/lib/marketing-copy";
import {
  dualCompoundedHeroPricingLine,
  dualCompoundedPromoShortPricingLine,
} from "@/lib/medication-pricing";
import { resolveVialImagery } from "@/lib/treatment-imagery";
import heroImg from "@/assets/hero.jpg";

const SEMA_VIAL = resolveVialImagery("semaglutide");

const CHECKLIST_ITEMS = [
  "Licensed USA physician network",
  "Private & secure encrypted intake",
  "USA 503A pharmacies",
  dualCompoundedPromoShortPricingLine(),
] as const;

/** Hero badge rotation — reuses the same approved trust claims shown elsewhere on this page (checklist row, promo line) rather than inventing new copy. */
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
 * Staggered fade-up entrance for the eyebrow/paragraph/CTA/checklist column.
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
 * scroll-linked parallax split between the columns for depth, a floating
 * medication vial bridging the seam as a third parallax plane, and a
 * full-width infinite marquee band anchored to its bottom edge.
 *
 * The lg min-height is deliberately `calc(100svh-4rem)` rather than a full
 * `100svh` — that headroom is what keeps the fixed site header from pushing
 * the checklist row and scroll cue below the fold on laptop-height windows
 * (~1280x700 after browser chrome). Vertical rhythm (margin-top and
 * padding-y utilities) and the headline's fluid clamp() size are tuned
 * against that same budget. It's capped at 50rem (800px) via `min()` so it
 * stops growing past that on very tall/large monitors — uncapped, the
 * content (vertically centered in the grid) ended up stranded in a wall of
 * empty space above and below on e.g. 1600px+-tall viewports.
 *
 * The marquee band (replacing the old animated "Scroll" cue in that same
 * spot) is viewport-fixed rather than positioned against the hero section's
 * own box — the headline's fluid clamp() can wrap to extra lines at some
 * widths, which grows the section past its `100svh-4rem` target, so
 * anchoring the marquee to the section's bottom edge would just push it
 * off-screen again along with that overflow. Fixing it to the viewport
 * guarantees it's visible on initial load regardless of hero content
 * height, and it fades out (`marqueeOpacity`) over the first slice of hero
 * scroll so it doesn't linger fixed over content further down the page.
 * The content grid's bottom padding (`pb-20`/`pb-24`) reserves room so the
 * checklist row doesn't render underneath it on load.
 */
export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const { container, item } = useHeroColumnStagger(Boolean(reduceMotion));
  const heroCta = resolveCta(CTA_IDS.home_hero);

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
  // Third parallax plane for the floating vial: it spins and drifts at a
  // different rate than either column as the hero scrolls out of view.
  const vialSpin = useTransform(
    scrollYProgress,
    [0, 1],
    [-18, reduceMotion ? -18 : 24],
  );
  const vialDrift = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -90],
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
      <div
        aria-hidden
        className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
      />
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
      />
      <FloatingHexagons className="z-0" />

      <div className="veya-container relative z-10 grid min-h-0 items-center gap-10 py-10 pb-20 md:py-12 md:pb-24 lg:min-h-[min(calc(100svh-4rem),50rem)] lg:grid-cols-2 lg:gap-12 lg:py-14 lg:pb-24">
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

          <h1 className="mt-4 text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.1] tracking-tight text-foreground">
            <LineReveal delay={0}>Weight-loss care </LineReveal>
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

          {/*
              LCP-critical: this is the largest text block painted on initial
              load. A prior version gave it a fast (duration:0.4, delay:0.05)
              opacity fade instead of the column's full stagger — but Lighthouse
              still measured it as render-delayed, because ANY Motion-driven
              opacity transition can't start until the Motion library's JS has
              hydrated, so the delay isn't really about duration, it's about
              waiting on JS at all. Rendered as a plain, unanimated <p> instead
              (same fix that worked for safety.tsx) so it paints as part of the
              server-rendered HTML/CSS with zero JS dependency.
            */}
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            USA physicians, licensed and certified USA 503A pharmacies,
            transparent cash pricing: {dualCompoundedHeroPricingLine()}. No
            bait-and-switch, no surprises, and thoughtful medical care that
            doesn&apos;t stop at the first prescription.
          </p>

          <motion.div
            variants={item}
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <MagneticButton>
              <Button asChild size="xl">
                <Link to={heroCta.to} search={heroCta.search}>
                  {heroCta.label} <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
            <MagneticButton>
              <Button asChild size="xl" variant="outline">
                <Link to="/how-it-works/">How it works</Link>
              </Button>
            </MagneticButton>
          </motion.div>

          <motion.p
            variants={item}
            className="mt-3 text-sm font-medium text-foreground"
          >
            {promoIncentiveLine()}.
            <span className="font-normal text-muted-foreground">
              {" "}
              Start your online visit today.
            </span>
          </motion.p>

          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"
          >
            {CHECKLIST_ITEMS.map((label) => (
              <span key={label} className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-accent-foreground" />{" "}
                {label}
              </span>
            ))}
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
            className="clip-hex relative aspect-[100/112] w-full overflow-hidden bg-ink lg:h-[min(62vh,480px)] lg:w-auto"
            style={reduceMotion ? undefined : { y: imageY, scale: imageScale }}
          >
            <img
              src={heroImg}
              alt="A calm, bright kitchen with fresh vegetables and a glass of water"
              width={1280}
              height={1024}
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

          <motion.div
            className="absolute -left-4 bottom-8 hidden sm:block md:-left-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 1.1,
              ease: EASE_OUT,
            }}
          >
            <motion.div
              className="glass-panel flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-foreground shadow-lift"
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.7,
                    }
              }
            >
              <CheckCircle2 className="size-4 shrink-0 text-accent-foreground" />
              Licensed USA physician network
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute -right-3 top-6 hidden sm:block md:-right-6"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 1.3,
              ease: EASE_OUT,
            }}
          >
            <motion.div
              className="glass-panel flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-foreground shadow-lift"
              animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 4.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.9,
                    }
              }
            >
              <ClipboardCheck className="size-4 shrink-0 text-accent-foreground" />
              Self-paced online intake
            </motion.div>
          </motion.div>
        </motion.div>

        {/*
            Floating medication vial — the "something moving" centerpiece.
            Uses the same product photo as the treatment cards
            (`resolveVialImagery().src`), so there is one vial image per
            medication sitewide. It overlaps the seam between the two columns
            and sits *behind* them (`z-0` here against `z-10` on both
            columns), so headline and photo copy always read over the top of
            it. Hidden below lg to avoid mobile clutter. Three nested motion
            layers so each motion plane (entrance, scroll-linked spin/drift,
            continuous levitation) composes independently instead of fighting
            over the same props:
              A. one-time fade/scale entrance + absolute centering
              B. scroll-linked spin (-18deg to +24deg) and drift, tied to the
                 same scrollYProgress as the two columns but at its own rate
              C. a perpetual gentle levitation loop (y +-10, rotate +-4deg,
                 6s mirrored ease-in-out), switched off under reduced motion
          */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden w-28 -translate-x-1/2 -translate-y-1/2 lg:block lg:w-32 xl:w-36"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 1,
            delay: reduceMotion ? 0 : 1.4,
            ease: EASE_OUT,
          }}
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl"
          />
          <motion.div
            style={
              reduceMotion ? undefined : { rotate: vialSpin, y: vialDrift }
            }
          >
            <motion.div
              className="glass-panel-clear rounded-3xl p-2 shadow-sm"
              animate={
                reduceMotion ? undefined : { y: [-10, 10], rotate: [-4, 4] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 6,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    }
              }
            >
              <img
                src={SEMA_VIAL.src}
                alt={SEMA_VIAL.alt}
                width={SEMA_VIAL.width}
                height={SEMA_VIAL.height}
                className="h-full w-full rounded-2xl object-cover drop-shadow-lg"
              />
            </motion.div>
          </motion.div>
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

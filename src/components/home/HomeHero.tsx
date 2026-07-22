import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
} from "lucide-react";
import {
  Eyebrow,
  FloatingHexagons,
  HexMotif,
  MagneticButton,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal, Marquee } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, WAITLIST_PATH, waitlistSearch } from "@/lib/cta-ids";
import {
  EARLY_ADOPTER_DISCOUNT,
  WAITLIST_CTA_LABEL,
  earlyAdopterIncentiveLine,
} from "@/lib/marketing-copy";
import {
  dualCompoundedHeroPricingLine,
  dualCompoundedShortPricingLine,
} from "@/lib/medication-pricing";
import heroImg from "@/assets/hero.jpg";
import semaVial from "@/assets/treatments/compounded-semaglutide-vial.png";

const CHECKLIST_ITEMS = [
  "Licensed USA physician network",
  "Private & secure encrypted intake",
  "USA compounding pharmacies",
  dualCompoundedShortPricingLine(),
] as const;

const MARQUEE_ITEMS = [
  "Licensed providers",
  dualCompoundedShortPricingLine(),
  "USA licensed pharmacies",
  "Private & secure encrypted intake",
  "HIPAA-aligned care",
  EARLY_ADOPTER_DISCOUNT,
  "5-minute eligibility check",
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
 * against that same budget.
 */
export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const { container, item } = useHeroColumnStagger(Boolean(reduceMotion));

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

  return (
    <>
      <section ref={heroRef} className="relative overflow-hidden bg-grad-hero">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <FloatingHexagons className="z-0" />

        <div className="veya-container relative z-10 grid min-h-0 items-center gap-10 py-10 md:py-12 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-2 lg:gap-12 lg:py-14">
          <motion.div
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
              <Eyebrow>GLP-1 weight-loss care</Eyebrow>
            </motion.div>

            <h1 className="mt-4 text-[clamp(2.25rem,5.2vw,4.75rem)] font-bold leading-[1.02] tracking-tight text-foreground">
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

            <motion.p
              variants={item}
              className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground"
            >
              USA physicians, licensed and certified USA compounding pharmacies,
              transparent cash pricing: {dualCompoundedHeroPricingLine()}. No
              bait-and-switch, no surprises, and thoughtful medical care that
              doesn&apos;t stop at the first prescription.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <MagneticButton>
                <Button asChild size="xl">
                  <Link
                    to={WAITLIST_PATH}
                    search={waitlistSearch(CTA_IDS.home_hero)}
                  >
                    {WAITLIST_CTA_LABEL} <ArrowRight />
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
              {earlyAdopterIncentiveLine()}.
              <span className="font-normal text-muted-foreground">
                {" "}
                Join the waitlist before launch.
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
            className="relative mx-auto w-full max-w-md lg:w-fit lg:max-w-none"
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
              style={
                reduceMotion ? undefined : { y: imageY, scale: imageScale }
              }
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
                5-minute eligibility check
              </motion.div>
            </motion.div>
          </motion.div>

          {/*
            Floating medication vial — the "something moving" centerpiece.
            Overlaps the seam between the two columns, hidden below lg to
            avoid mobile clutter. Three nested motion layers so each motion
            plane (entrance, scroll-linked spin/drift, continuous levitation)
            composes independently instead of fighting over the same props:
              A. one-time fade/scale entrance + absolute centering
              B. scroll-linked spin (-18deg to +24deg) and drift, tied to the
                 same scrollYProgress as the two columns but at its own rate
              C. a perpetual gentle levitation loop (y +-10, rotate +-4deg,
                 6s mirrored ease-in-out), switched off under reduced motion
          */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden w-28 -translate-x-1/2 -translate-y-1/2 lg:block lg:w-32 xl:w-36"
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
                className="glass-panel rounded-3xl p-3 shadow-lift"
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
                  src={semaVial}
                  alt="Compounded semaglutide medication vial"
                  width={200}
                  height={200}
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {!reduceMotion && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-6 z-10 hidden justify-center md:flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex flex-col items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              <span>Scroll</span>
              <ChevronDown className="size-4" />
            </motion.div>
          </motion.div>
        )}
      </section>

      <div className="relative z-10 bg-grad-ink py-5 text-ink-foreground">
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
      </div>
    </>
  );
}

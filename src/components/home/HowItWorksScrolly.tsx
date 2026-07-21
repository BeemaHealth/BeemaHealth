import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ClipboardCheck,
  Send,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Eyebrow, HexBadge, HexMotif } from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer a 5-minute set of questions to see if Beema Health can help you.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Complete a secure medical questionnaire for provider review, private and encrypted",
  },
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "A licensed provider reviews your information and determines the next steps of medical care based on their independent, professional medical judgment. No prescription is guaranteed.",
  },
];

/**
 * One step card. A giant outlined step number bleeds off the top-right
 * corner and is cropped by the card's own `overflow-hidden` rounded edge,
 * so it reads as a layered watermark sitting *behind* the copy rather than
 * a number floating in empty space. Entrance is a strong staggered pop with
 * an alternating tilt that settles flat, and a honey progress chip fills in
 * along the bottom once the card is in view.
 */
function StepCard({
  step,
  index,
  reduceMotion,
}: {
  step: Step;
  index: number;
  reduceMotion: boolean | null;
}) {
  const Icon = step.icon;
  const tilt = index % 2 === 0 ? -1.5 : 1.5;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-4xl border border-border bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift md:p-8"
      initial={reduceMotion ? false : { opacity: 0, y: 40, rotate: tilt }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{
        duration: reduceMotion ? 0 : 0.7,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : index * 0.12,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-5 top-4 select-none text-8xl font-bold leading-none text-outline-primary"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative">
        <HexBadge className="mb-5">
          <Icon className="size-6" aria-hidden />
        </HexBadge>
        <span className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
          Step {index + 1}
        </span>
        <h3 className="mt-2 text-xl font-bold text-foreground md:text-2xl">
          {step.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {step.text}
        </p>

        <div className="relative mt-6 h-1 w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-accent-foreground"
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              ease: EASE_OUT,
              delay: reduceMotion ? 0 : index * 0.12 + 0.25,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact, layered "how it works" section — normal document flow, no
 * pinning. Three dense step cards sit in a responsive grid with a
 * scroll-scrubbed connector line drawn behind them, staggered entrances,
 * and a faint grain + drifting hex motif for ambient depth.
 */
export function HowItWorksScrolly() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Connector line scrubs open as the row crosses the viewport; rendered
  // fully drawn (no scrub) under reduced motion.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 75%", "end 45%"],
  });
  const lineScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative overflow-hidden bg-background py-16 md:py-24"
    >
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 text-foreground/[0.035]"
      />
      <HexMotif className="pointer-events-none absolute -left-12 top-6 w-40 text-primary/10 float-slow" />
      <HexMotif className="pointer-events-none absolute -right-16 bottom-0 w-56 text-primary/10 float-slower" />

      <div className="veya-container relative">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            <LineReveal>Three simple steps</LineReveal>
          </h2>
        </div>

        <div className="relative mt-10 md:mt-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-14 z-0 hidden h-px md:block"
          >
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              style={{ scaleX: reduceMotion ? 1 : lineScaleX }}
            />
          </div>

          <div className="relative z-10 grid gap-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <StepCard
                key={step.title}
                step={step}
                index={i}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

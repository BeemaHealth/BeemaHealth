import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ClipboardCheck,
  Stethoscope,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Eyebrow, HexBadge, HexMotif } from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { cn } from "@/lib/utils";

export const HOW_IT_WORKS_STEPS_TOTAL = 3;

type Step = {
  icon: LucideIcon;
  title: string;
  blurb: string;
};

/**
 * The single source of truth for Beema's 3-step journey. Used verbatim by
 * the home page, /how-it-works, and the tirzepatide/semaglutide treatment
 * pages via <HowItWorksSteps /> so those surfaces never drift out of sync.
 */
const STEPS: Step[] = [
  {
    icon: ClipboardCheck,
    title: "Complete your medical intake",
    blurb:
      "Create a secure account and complete a full medical intake covering your health history, medications, and goals, at your own pace.",
  },
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    blurb:
      "An independently licensed provider evaluates your case and decides whether treatment may be appropriate. It's never guaranteed.",
  },
  {
    icon: Truck,
    title: "Prescription approved, filled, and shipped",
    blurb:
      "If approved, your prescription moves to a licensed pharmacy and ships to your door, with status updates the whole way.",
  },
];

/**
 * One step in the diagram: giant outlined watermark number bleeding from the
 * corner, hex badge, tilt pop-in entrance, hover lift, and a gradient accent
 * underline that fills in on scroll.
 */
function StepDiagramCard({
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
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-lift"
      initial={reduceMotion ? false : { opacity: 0, y: 32, rotate: tilt }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{
        duration: reduceMotion ? 0 : 0.6,
        delay: reduceMotion ? 0 : index * 0.15,
        ease: EASE_OUT,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 select-none text-8xl font-bold leading-none text-outline-primary"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex h-full flex-col">
        <HexBadge className="size-14">
          <Icon className="size-6" />
        </HexBadge>
        <span className="mt-4 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
          Step {index + 1} of {HOW_IT_WORKS_STEPS_TOTAL}
        </span>
        <h3 className="mt-1 text-lg font-bold text-foreground">{step.title}</h3>

        <div className="mt-3 h-1 w-[85%] overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-accent-foreground"
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={reduceMotion ? undefined : { scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : index * 0.15 + 0.25,
              ease: EASE_OUT,
            }}
          />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {step.blurb}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Decorative connector between two step cards: a hand-drawn curved line
 * that strokes itself in on scroll (same `pathLength` technique as
 * `InfinityMotif`) with a small dot that loops along the curve to suggest
 * forward motion, capped with an arrowhead. Horizontal + arcing upward on
 * desktop, vertical + arcing sideways on mobile. Purely decorative, not a
 * list item, so it lives inside the previous step's `<li>` rather than
 * between them.
 */
function StepConnector({
  index,
  reduceMotion,
}: {
  index: number;
  reduceMotion: boolean | null;
}) {
  const dotTransition = {
    duration: 2.2,
    repeat: Infinity,
    repeatDelay: 0.4,
    ease: EASE_OUT,
    delay: reduceMotion ? 0 : index * 0.15 + 0.9,
  };

  return (
    <motion.div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center self-center py-1 text-primary/50 md:h-10 md:w-16 md:py-0"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{
        duration: reduceMotion ? 0 : 0.35,
        delay: reduceMotion ? 0 : index * 0.15 + 0.35,
        ease: EASE_OUT,
      }}
    >
      {/* Mobile: vertical curve */}
      <svg
        viewBox="0 0 32 64"
        className="h-16 w-8 md:hidden"
        fill="none"
        focusable="false"
      >
        <motion.path
          d="M16,4 Q4,32 16,60"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 5"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={reduceMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            delay: reduceMotion ? 0 : index * 0.15 + 0.35,
            ease: EASE_OUT,
          }}
        />
        {!reduceMotion && (
          <motion.circle
            r="2.5"
            fill="currentColor"
            strokeDasharray="0"
            animate={{ cx: [16, 8, 16], cy: [6, 32, 58] }}
            transition={dotTransition}
          />
        )}
      </svg>
      <ArrowDown className="absolute bottom-0 size-4 md:hidden" />

      {/* Desktop: horizontal curve */}
      <svg
        viewBox="0 0 64 32"
        className="hidden h-8 w-16 md:block"
        fill="none"
        focusable="false"
      >
        <motion.path
          d="M4,16 Q32,4 60,16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 5"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={reduceMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            delay: reduceMotion ? 0 : index * 0.15 + 0.35,
            ease: EASE_OUT,
          }}
        />
        {!reduceMotion && (
          <motion.circle
            r="2.5"
            fill="currentColor"
            strokeDasharray="0"
            animate={{ cx: [4, 32, 60], cy: [14, 6, 14] }}
            transition={dotTransition}
          />
        )}
      </svg>
      <ArrowRight className="absolute right-0 hidden size-4 md:block" />
    </motion.div>
  );
}

/**
 * Self-contained "how it works" section: eyebrow, heading, and the 3-step
 * diagram. Rendered on the home page, /how-it-works, and treatment pages so
 * the journey copy never drifts. Treatment pages can override the heading
 * and show a care follow-up note under the steps.
 */
export function HowItWorksSteps({
  eyebrow = "How it works",
  title,
  showCareFollowUpNote = false,
  className,
  id = "how-it-works",
}: {
  eyebrow?: string;
  title?: ReactNode;
  /** Support / doctor follow-up note under the steps (treatment pages). */
  showCareFollowUpNote?: boolean;
  className?: string;
  id?: string;
} = {}) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden bg-background py-16 md:py-24",
        className,
      )}
    >
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 text-foreground/[0.035]"
      />
      <HexMotif className="pointer-events-none absolute -left-12 top-6 w-40 text-primary/10 float-slow" />
      <HexMotif className="pointer-events-none absolute -right-16 bottom-0 w-56 text-primary/10 float-slower" />

      <div className="veya-container relative">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            {title ?? <LineReveal>Three simple steps</LineReveal>}
          </h2>
        </div>

        <ol className="relative z-10 mt-10 flex flex-col items-stretch md:mt-14 md:flex-row md:items-stretch">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-1 flex-col items-stretch md:flex-row"
            >
              <div className="flex-1">
                <StepDiagramCard
                  step={step}
                  index={i}
                  reduceMotion={reduceMotion}
                />
              </div>
              {i < STEPS.length - 1 && (
                <StepConnector index={i} reduceMotion={reduceMotion} />
              )}
            </li>
          ))}
        </ol>

        {showCareFollowUpNote && (
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
            For any follow-ups or questions, reach out to{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary underline"
            >
              support
            </a>{" "}
            or your doctor during your visit.
          </p>
        )}
      </div>
    </section>
  );
}

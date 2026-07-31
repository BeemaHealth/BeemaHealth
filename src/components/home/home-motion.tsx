import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Shared entrance easing for the premium homepage sections. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Clip-masked slide-up reveal for one line of display type. The outer span
 * clips; the inner line rises from below it when scrolled into view. Under
 * reduced motion the line renders in place with no animation.
 *
 * Bottom padding + matching negative margin leave room for descenders (g, y,
 * p) inside the overflow clip without adding visual gap between stacked lines.
 */
export function LineReveal({
  children,
  className,
  innerClassName,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Seconds; stagger sibling lines by ~0.08–0.12. */
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  // Observe the stationary outer clip, not the inner line: the line starts
  // translated fully outside the clip, so it never intersects the viewport
  // on its own and whileInView would never fire.
  const clipRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(clipRef, { once: true, amount: 0.5 });
  return (
    <span
      ref={clipRef}
      className={cn("block overflow-hidden pb-[0.2em] -mb-[0.12em]", className)}
    >
      <motion.span
        className={cn("block", innerClassName)}
        initial={reduceMotion ? false : { y: "112%" }}
        animate={inView ? { y: "0%" } : undefined}
        transition={{
          duration: reduceMotion ? 0 : 0.9,
          ease: EASE_OUT,
          delay: reduceMotion ? 0 : delay,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/**
 * Eyebrow-styled pill (mirrors `Eyebrow` in site/primitives.tsx) that rotates
 * through a list of short trust-signal claims, sliding the current one out
 * and the next one in every `interval` ms. `layout` on the outer pill
 * smooths the width change as message lengths differ. Rotation pauses on
 * hover/focus so a reader isn't fighting the swap mid-read, and freezes on
 * the first message under reduced motion — the same settled-state
 * convention as `Marquee`/`CountUp` above.
 */
export function RotatingBadge({
  messages,
  interval = 2000,
  className,
}: {
  messages: readonly string[];
  /** Milliseconds between rotations. */
  interval?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduceMotion || paused || messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, interval);
    return () => clearInterval(id);
  }, [reduceMotion, paused, messages.length, interval]);

  return (
    <motion.span
      layout
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={messages[index]}
          initial={reduceMotion ? false : { y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: -10, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="whitespace-nowrap"
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/**
 * Infinite horizontal marquee. Children are rendered twice (second copy
 * aria-hidden) and the tracks scroll seamlessly via the `.marquee-track`
 * CSS in styles.css, which is inert under reduced motion.
 */
export function Marquee({
  children,
  className,
  trackClassName,
  duration = 28,
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  /** Seconds per full loop. */
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <div className={cn("marquee", className)}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1 || undefined}
          className={cn(
            "marquee-track",
            reverse && "marquee-track-reverse",
            trackClassName,
          )}
          style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/**
 * Animated count-up that runs once when scrolled into view. Renders the
 * final value immediately under reduced motion. Use only for numbers that
 * already exist in approved copy — never invent stats.
 */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  className,
  duration = 1.6,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => `${prefix}${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, reduceMotion, to, duration, value]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

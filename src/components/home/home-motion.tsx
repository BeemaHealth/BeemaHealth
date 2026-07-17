import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
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
    <span ref={clipRef} className={cn("block overflow-hidden", className)}>
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

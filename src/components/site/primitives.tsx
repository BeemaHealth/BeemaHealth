import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <div className="veya-container">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  /** Page heroes should pass `as="h1"`; section titles stay the default `h2`. */
  as = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2";
}) {
  const TitleTag = as;
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <TitleTag className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
        {title}
      </TitleTag>
      {description && (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Scroll-reveal wrapper. Slides content up + fades in the first time it
 * enters the viewport. CSS lives in styles.css under
 * `prefers-reduced-motion: no-preference`, so reduced-motion users (and
 * no-JS environments before hydration) get static, fully visible content.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -48px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style =
    delay > 0
      ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties)
      : undefined;

  return (
    <div ref={ref} className={cn("reveal", className)} style={style}>
      {children}
    </div>
  );
}

/** Lucide ships a "Twitter" bird icon but no X wordmark glyph; hand-drawn to match X's current brand mark. */
export function XGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231ZM17.083 19.77h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}

/** Lucide has no Reddit "snoo" mark; hand-drawn to match Reddit's brand glyph. */
export function RedditGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 013.11 12.5c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.025-.573zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z" />
    </svg>
  );
}

/** Hexagon-clipped icon chip - nature's most efficient shape, brand motif. */
export function HexBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "clip-hex grid size-12 shrink-0 place-items-center bg-primary text-primary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Infinity linework motif (the bee's wings) - decorative only.
 * Inherits `currentColor`; size with width/height classes.
 *
 * `animateDraw` traces the stroke in as it scrolls into view (Motion
 * `pathLength`, once). Falls back to the static path under reduced motion.
 */
export function InfinityMotif({
  className,
  animateDraw = false,
}: {
  className?: string;
  animateDraw?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const d =
    "M50 24C42 8 18 8 18 24C18 40 42 40 50 24C58 8 82 8 82 24C82 40 58 40 50 24Z";

  return (
    <svg
      viewBox="0 0 100 48"
      fill="none"
      aria-hidden
      className={className}
      focusable="false"
    >
      {animateDraw && !reduceMotion ? (
        <motion.path
          d={d}
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        <path
          d={d}
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** Hexagon outline motif - decorative only. Inherits `currentColor`. */
export function HexMotif({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 112"
      fill="none"
      aria-hidden
      className={className}
      style={style}
      focusable="false"
    >
      <path
        d="M50 4L94 30V82L50 108L6 82V30L50 4Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FloatingHex = {
  top: string;
  size: string;
  duration: number;
  delay: number;
  opacity: number;
};

/**
 * Add/remove entries or tweak values here to change how many hexagons drift
 * through <FloatingHexagons> and how they look:
 * - top: vertical position as a % of the container's height
 * - size: Tailwind width class (w-*) - height follows automatically (svg is square-ish)
 * - duration: seconds for one full left-to-right pass - smaller is faster
 * - delay: seconds before this hexagon starts its first pass - stagger these
 *   so hexagons don't all cross the screen at once
 * - opacity: peak opacity while fully on-screen (fades to 0 at the edges)
 */
const DEFAULT_FLOATING_HEXES: FloatingHex[] = [
  { top: "6%", size: "w-8", duration: 24, delay: 0, opacity: 0.4 },
  { top: "14%", size: "w-5", duration: 31, delay: 7, opacity: 0.35 },
  { top: "22%", size: "w-16", duration: 19, delay: 14, opacity: 0.25 },
  { top: "30%", size: "w-6", duration: 36, delay: 3, opacity: 0.45 },
  { top: "38%", size: "w-12", duration: 22, delay: 18, opacity: 0.3 },
  { top: "46%", size: "w-20", duration: 28, delay: 3, opacity: 0.2 },
  { top: "54%", size: "w-5", duration: 17, delay: 14, opacity: 0.5 },
  { top: "62%", size: "w-10", duration: 33, delay: 5, opacity: 0.35 },
  { top: "70%", size: "w-8", duration: 26, delay: 15, opacity: 0.4 },
  { top: "78%", size: "w-14", duration: 20, delay: 1, opacity: 0.25 },
  { top: "86%", size: "w-6", duration: 38, delay: 11, opacity: 0.45 },
  { top: "93%", size: "w-12", duration: 29, delay: 19, opacity: 0.3 },
];

/**
 * A handful of hexagon outlines that drift left-to-right and fade in/out at
 * the edges, each on its own size/speed/delay - occasional accents on a
 * clean background, not a dense tiled pattern. Respects reduced motion via
 * the `.hex-drift` CSS (see styles.css), which falls back to a static
 * position when motion is disabled.
 */
export function FloatingHexagons({
  className,
  hexes = DEFAULT_FLOATING_HEXES,
}: {
  className?: string;
  hexes?: FloatingHex[];
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {hexes.map((hex, i) => (
        <HexMotif
          key={i}
          className={cn("hex-drift text-primary", hex.size)}
          style={
            {
              "--hex-drift-top": hex.top,
              "--hex-drift-duration": `${hex.duration}s`,
              "--hex-drift-delay": `${hex.delay}s`,
              "--hex-drift-opacity": hex.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Wraps a button/link so it eases toward the cursor within a small radius
 * (a "magnetic" hover, common on premium marketing sites) on top of the
 * usual hover/tap scale. Pointer tracking and the scale feedback are two
 * independent reduced-motion opt-outs: under reduced motion neither runs
 * and children render inert.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  /** Fraction of the cursor's offset from center to follow (0–1). */
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.4 });

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reduceMotion ? undefined : { x: springX, y: springY }}
      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fixed top-of-viewport bar tracking page scroll progress. A functional
 * wayfinding cue rather than decoration, but it's an autonomous visual
 * effect with no purpose to a reduced-motion user, so it renders nothing
 * in that mode rather than showing a static full/empty bar.
 */
export function ScrollProgressBar({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-primary via-accent-foreground to-primary",
        className,
      )}
      style={{ scaleX: scrollYProgress }}
    />
  );
}

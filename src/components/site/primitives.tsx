import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
        {title}
      </h2>
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

/** Hexagon-clipped icon chip — nature's most efficient shape, brand motif. */
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
 * Infinity linework motif (the bee's wings) — decorative only.
 * Inherits `currentColor`; size with width/height classes.
 */
export function InfinityMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 48"
      fill="none"
      aria-hidden
      className={className}
      focusable="false"
    >
      <path
        d="M50 24C42 8 18 8 18 24C18 40 42 40 50 24C58 8 82 8 82 24C82 40 58 40 50 24Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Hexagon outline motif — decorative only. Inherits `currentColor`. */
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
 * - size: Tailwind width class (w-*) — height follows automatically (svg is square-ish)
 * - duration: seconds for one full left-to-right pass — smaller is faster
 * - delay: seconds before this hexagon starts its first pass — stagger these
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
 * the edges, each on its own size/speed/delay — occasional accents on a
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

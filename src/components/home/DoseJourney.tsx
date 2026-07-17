import { useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/site/primitives";
import { EASE_OUT } from "@/components/home/home-motion";

/** Approved site copy only — one line per phase, crossfaded in the caption bar. */
const CAPTIONS = [
  "GLP-1 weight-loss care",
  "Weekly injection, if prescribed",
  "Licensed providers. USA licensed pharmacies.",
  "Care that doesn't stop at the first prescription",
] as const;

const PHASE_TITLES = [
  "The vial",
  "Drawing the dose",
  "The injection",
  "Ongoing care",
] as const;

/** Progress boundaries for the four phases, used by the segment-fill indicator and phase gates. */
const PHASE_BOUNDS = [0, 0.25, 0.5, 0.75, 1] as const;

const CONFETTI_COUNT = 8;
const SPARKLE_COUNT = 3;
const INJECTION_RING_COUNT = 3;
const DRIFT_HEX_COUNT = 12;
const STAGE_CX = 400;
const STAGE_CY = 300;
const CONFETTI_BASE_X = 580;
const CONFETTI_BASE_Y = 300;

/** Six points of a small regular hexagon centered on its own local origin. */
function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

/** A small 4-point sparkle star (diamond-lobed), centered on its own local origin. */
function sparklePoints(rOuter: number, rInner: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = (Math.PI / 180) * (45 * i - 90);
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

/** Deterministic pseudo-random in [0,1) from an integer seed — stable across server/client renders. */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Fixed drift particle geometry — computed once at module scope, not per-render. */
const DRIFT_HEXES = Array.from({ length: DRIFT_HEX_COUNT }, (_, i) => {
  const x = 40 + seeded(i * 3.1) * 720;
  const size = 3.5 + seeded(i * 5.7) * 4;
  const duration = 7 + seeded(i * 2.3) * 6;
  const delay = seeded(i * 4.9) * 6;
  const peakOpacity = 0.12 + seeded(i * 6.1) * 0.22;
  const drift = 14 + seeded(i * 8.3) * 22;
  return { x, size, duration, delay, peakOpacity, drift };
});

/**
 * Which of the four phases is active right now, as plain React state derived
 * from the progress MotionValue. Used only to key the masked caption swap —
 * everything else in the scene reads `progress` directly and never re-renders.
 */
function useActivePhaseIndex(progress: MotionValue<number>): number {
  const [index, setIndex] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const next = Math.min(3, Math.max(0, Math.floor(v * 4)));
    setIndex((prev) => (prev === next ? prev : next));
  });
  return index;
}

/**
 * All scroll/timeline-driven choreography for the four phases, in one stable
 * hook call site. Every animated value in `DoseScene` is a `useTransform`
 * derived from this single `progress` MotionValue (0 → 1) — nothing here
 * depends on wall-clock time, so it works identically whether `progress` is
 * fed by scroll (desktop) or a looping timeline (mobile).
 */
function useDoseChoreography(progress: MotionValue<number>) {
  // Phase 1 (0 → 0.25) — the vial rises in, spins once, and settles
  // center-left; it then holds through phase 2 and drifts out during phase 3.
  const vialX = useTransform(progress, [0.5, 0.68], [0, -300]);
  const vialY = useTransform(progress, [0, 0.18], [160, 0]);
  const vialRotate = useTransform(progress, [0, 0.22], [0, 360]);
  const vialOpacity = useTransform(
    progress,
    [0, 0.15, 0.52, 0.66],
    [0, 1, 1, 0],
  );
  const vialLiquidHeight = useTransform(progress, [0.25, 0.48], [150, 40]);
  const vialLiquidY = useTransform(vialLiquidHeight, (h) => 430 - h);
  const vialLiquidWobbleOpacity = useTransform(vialLiquidHeight, (h) =>
    h > 6 ? 1 : 0,
  );

  // Phase 2 (0.25 → 0.5) — the syringe slides in and draws the dose at the
  // vial; phase 3 (0.5 → 0.75) carries it to the character's stomach —
  // rotating so the needle points into the belly — and depresses the
  // plunger; it exits as phase 4 begins.
  const syringeX = useTransform(
    progress,
    [0.2, 0.4, 0.5, 0.64, 0.78, 0.9],
    [700, 250, 250, 528, 528, 780],
  );
  const syringeY = useTransform(
    progress,
    [0.2, 0.4, 0.5, 0.64, 0.78, 0.9],
    [120, 220, 220, 396, 396, 300],
  );
  // Rotates about the needle tip (the group origin) during the hand-off so
  // the down-pointing needle swings to point right, into the belly.
  const syringeRotate = useTransform(
    progress,
    [0.52, 0.64, 0.8, 0.9],
    [0, -70, -70, -30],
  );
  const syringeOpacity = useTransform(
    progress,
    [0.16, 0.22, 0.79, 0.9],
    [0, 1, 1, 0],
  );
  const syringeLiquidHeight = useTransform(
    progress,
    [0.25, 0.48, 0.64, 0.74],
    [0, 84, 84, 0],
  );
  const syringeLiquidY = useTransform(syringeLiquidHeight, (h) => -46 - h);
  const plungerY = useTransform(
    progress,
    [0.25, 0.46, 0.64, 0.74],
    [0, -26, -26, 34],
  );
  const dropletScale = useTransform(progress, [0.44, 0.47, 0.6], [0, 1.2, 1]);

  // Phase 3/4 — the character arrives for the injection, then bounces and
  // smiles wider as phase 4's celebration plays; the free arm waves once
  // it's fully in view.
  const characterX = useTransform(progress, [0.5, 0.66], [260, 0]);
  const characterOpacity = useTransform(progress, [0.46, 0.55], [0, 1]);
  const characterScale = useTransform(
    progress,
    [0.75, 0.85, 0.95],
    [1, 1.06, 1],
  );
  const mouthNormalOpacity = useTransform(progress, [0.75, 0.85], [1, 0]);
  const mouthWideOpacity = useTransform(progress, [0.75, 0.85], [0, 1]);
  const armWaveOpacity = useTransform(progress, [0.76, 0.84], [0, 1]);
  const blinkGateOpacity = useTransform(progress, [0.46, 0.55], [0, 1]);

  // Phase-reactive key light: eases from the vial, through the hand-off, to
  // the character's stomach, and pulses brighter at each phase boundary.
  const glowX = useTransform(
    progress,
    [0, 0.25, 0.5, 0.75, 1],
    [250, 250, 400, 545, 560],
  );
  const glowY = useTransform(
    progress,
    [0, 0.25, 0.5, 0.75, 1],
    [340, 340, 300, 392, 340],
  );
  const glowOpacity = useTransform(
    progress,
    [0, 0.06, 0.24, 0.3, 0.49, 0.55, 0.74, 0.8, 1],
    [0.22, 0.5, 0.3, 0.52, 0.3, 0.55, 0.32, 0.5, 0.4],
  );

  // Celebration confetti/sparkle burst gate for phase 4.
  const celebrateOpacity = useTransform(progress, [0.76, 0.85], [0, 1]);

  return {
    vialX,
    vialY,
    vialRotate,
    vialOpacity,
    vialLiquidHeight,
    vialLiquidY,
    vialLiquidWobbleOpacity,
    syringeX,
    syringeY,
    syringeRotate,
    syringeOpacity,
    syringeLiquidHeight,
    syringeLiquidY,
    plungerY,
    dropletScale,
    characterX,
    characterOpacity,
    characterScale,
    mouthNormalOpacity,
    mouthWideOpacity,
    armWaveOpacity,
    blinkGateOpacity,
    glowX,
    glowY,
    glowOpacity,
    celebrateOpacity,
  };
}

/**
 * One hexagon of the phase-4 celebration confetti. Pops outward from behind
 * the character (scale 0→1, radial translate, rotate, fade) on its own
 * slightly staggered slice of the phase-4 window. Each hex is its own
 * component so its `useTransform` calls sit at a stable top-level call site
 * per instance, instead of inside the parent's render loop.
 */
function ConfettiHex({
  progress,
  index,
}: {
  progress: MotionValue<number>;
  index: number;
}) {
  const angle = (index / CONFETTI_COUNT) * Math.PI * 2 - Math.PI / 2;
  const distance = 86 + (index % 3) * 22;
  const size = 7 + (index % 3) * 2.5;
  const spin = 140 + (index % 4) * 60;
  const start = 0.77 + index * 0.014;
  const end = Math.min(start + 0.12, 0.99);

  const t = useTransform(progress, [start, end], [0, 1]);
  const scale = useTransform(t, [0, 1], [0, 1]);
  const rotate = useTransform(t, [0, 1], [0, spin]);
  const opacity = useTransform(t, [0, 0.2, 1], [0, 1, 0.75]);
  const x = useTransform(
    t,
    (v) => CONFETTI_BASE_X + Math.cos(angle) * distance * v,
  );
  const y = useTransform(
    t,
    (v) => CONFETTI_BASE_Y + Math.sin(angle) * distance * v,
  );

  return (
    <motion.g style={{ x, y, scale, rotate, opacity }}>
      <polygon points={hexPoints(size)} className="fill-primary" />
    </motion.g>
  );
}

/**
 * One twinkling sparkle in the phase-4 celebration: pops in on its slice of
 * the phase-4 window, then twinkles continuously (scale + opacity loop) for
 * as long as it's visible.
 */
function SparkleStar({
  progress,
  index,
}: {
  progress: MotionValue<number>;
  index: number;
}) {
  const positions = [
    { x: 500, y: 220 },
    { x: 650, y: 260 },
    { x: 560, y: 420 },
  ];
  const pos = positions[index % positions.length];
  const start = 0.8 + index * 0.03;
  const end = Math.min(start + 0.08, 0.99);
  const appear = useTransform(progress, [start, end], [0, 1]);

  return (
    <motion.g style={{ x: pos.x, y: pos.y, opacity: appear }}>
      <motion.g
        animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 2.4 + index * 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.5,
        }}
      >
        <polygon points={sparklePoints(9, 3)} className="fill-accent" />
      </motion.g>
    </motion.g>
  );
}

/**
 * One expanding, fading pulse ring at the injection contact point. Runs a
 * continuous scale/opacity loop, but sits inside a phase-3-gated wrapper so
 * it only reads as active during the injection window.
 */
function InjectionPulseRing({
  progress,
  index,
}: {
  progress: MotionValue<number>;
  index: number;
}) {
  const gateOpacity = useDoseInjectionGate(progress);

  return (
    <motion.g style={{ x: 528, y: 396, opacity: gateOpacity }}>
      <motion.circle
        r={14}
        className="fill-none stroke-primary"
        strokeWidth={2.5}
        animate={{ scale: [0.4, 1.6], opacity: [0.7, 0] }}
        transition={{
          duration: 1.1,
          repeat: Infinity,
          ease: "easeOut",
          delay: index * 0.35,
        }}
      />
    </motion.g>
  );
}

/** Shared phase-3 injection-window opacity gate — one hook call site, reused by each pulse ring. */
function useDoseInjectionGate(progress: MotionValue<number>) {
  return useTransform(progress, [0.62, 0.66, 0.73, 0.77], [0, 1, 1, 0]);
}

/**
 * The entire animated SVG stage — vial, syringe, character, and every
 * ambient effect around them. All phase choreography reads from the single
 * `progress` MotionValue via `useTransform`, so the exact same scene plays
 * whether `progress` is scroll-linked (desktop, spring-smoothed) or driven
 * by a looping timeline (mobile, autoplay). Time-based idle motion (blinks,
 * wobble, drifting hexes, the honeycomb rotation) is layered on top via
 * nested `motion.g` elements using declarative `animate` loops, gated off
 * under reduced motion by the caller never mounting this component.
 */
function DoseScene({ progress }: { progress: MotionValue<number> }) {
  const uid = useId();
  const gradientId = `dose-vial-glass-${uid}`;
  const c = useDoseChoreography(progress);

  const bob = (duration: number, distance = 6) => ({
    animate: { y: [0, -distance, 0] },
    transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
  });

  return (
    <svg
      viewBox="0 0 800 600"
      aria-hidden
      focusable="false"
      className="mt-6 w-full max-w-3xl"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--primary)" }} />
          <stop offset="100%" style={{ stopColor: "var(--primary-soft)" }} />
        </linearGradient>
      </defs>

      {/* Slowly rotating honeycomb ring — ambient depth behind the action. */}
      <motion.g style={{ x: STAGE_CX, y: STAGE_CY }}>
        <motion.g
          className="will-change-transform"
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        >
          {[70, 100, 128].map((r, i) => (
            <polygon
              key={r}
              points={hexPoints(r)}
              className="fill-none stroke-primary"
              strokeWidth={1.25}
              opacity={0.1 - i * 0.02}
            />
          ))}
        </motion.g>
      </motion.g>

      {/* Drifting hex particles — continuous, cap at DRIFT_HEX_COUNT. */}
      {DRIFT_HEXES.map((p, i) => (
        <motion.g
          key={i}
          initial={{ x: p.x, y: 600, opacity: 0 }}
          animate={{
            y: [600, -20],
            opacity: [0, p.peakOpacity, p.peakOpacity, 0],
            x: [p.x, p.x + p.drift],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.15, 0.85, 1],
          }}
        >
          <polygon points={hexPoints(p.size)} className="fill-primary" />
        </motion.g>
      ))}

      {/* Phase-reactive key light. */}
      <motion.circle
        r={130}
        className="fill-primary"
        style={{ x: c.glowX, y: c.glowY, opacity: c.glowOpacity }}
      />
      <motion.circle
        r={64}
        className="fill-accent"
        style={{ x: c.glowX, y: c.glowY, opacity: c.glowOpacity }}
      />

      {/* Vial */}
      <motion.g
        style={{
          x: c.vialX,
          y: c.vialY,
          rotate: c.vialRotate,
          opacity: c.vialOpacity,
          transformOrigin: "250px 340px",
        }}
      >
        <ellipse
          cx={250}
          cy={452}
          rx={54}
          ry={10}
          className="fill-ink"
          opacity={0.28}
        />
        <motion.g className="will-change-transform" {...bob(3.6, 5)}>
          <rect
            x={200}
            y={250}
            width={100}
            height={190}
            rx={22}
            fill={`url(#${gradientId})`}
          />
          <rect
            x={214}
            y={264}
            width={9}
            height={168}
            rx={4}
            className="fill-background"
            opacity={0.22}
          />
          <motion.rect
            x={210}
            width={80}
            rx={8}
            className="fill-accent"
            style={{ y: c.vialLiquidY, height: c.vialLiquidHeight }}
          />
          <motion.ellipse
            cx={250}
            rx={40}
            ry={5}
            className="fill-accent-foreground"
            style={{ y: c.vialLiquidY, opacity: c.vialLiquidWobbleOpacity }}
            animate={{ rx: [40, 36, 40], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <rect
            x={222}
            y={296}
            width={56}
            height={5}
            rx={2.5}
            className="fill-ink-foreground"
            opacity={0.55}
          />
          <rect
            x={222}
            y={306}
            width={40}
            height={5}
            rx={2.5}
            className="fill-ink-foreground"
            opacity={0.4}
          />
          <rect
            x={200}
            y={320}
            width={100}
            height={46}
            className="fill-primary-soft"
          />
          <rect
            x={200}
            y={318}
            width={100}
            height={5}
            className="fill-ink"
            opacity={0.15}
          />
          <rect
            x={210}
            y={222}
            width={80}
            height={34}
            rx={10}
            className="fill-ink-foreground"
          />
          <rect
            x={210}
            y={236}
            width={80}
            height={6}
            className="fill-ink"
            opacity={0.12}
          />
        </motion.g>
      </motion.g>

      {/* Character */}
      <motion.g
        style={{
          x: c.characterX,
          opacity: c.characterOpacity,
          scale: c.characterScale,
          transformOrigin: "580px 340px",
        }}
      >
        <ellipse
          cx={560}
          cy={438}
          rx={70}
          ry={12}
          className="fill-ink"
          opacity={0.28}
        />
        <motion.g className="will-change-transform" {...bob(3.8, 4)}>
          {/* Near arm — lifted up and out of the way to expose the stomach
              for the injection */}
          <path
            d="M540 330 Q490 315 470 285"
            strokeWidth={34}
            strokeLinecap="round"
            fill="none"
            className="stroke-ink"
          />
          <circle
            cx={470}
            cy={285}
            r={16}
            strokeWidth={2}
            className="fill-ink stroke-ink-foreground/40"
          />

          {/* Free arm — rests, then waves once phase 4 arrives */}
          <motion.g
            style={{
              x: 630,
              y: 320,
              opacity: c.armWaveOpacity,
              transformOrigin: "630px 320px",
            }}
            animate={{ rotate: [-4, 12, -4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M0 0 Q28 -18 44 -52"
              strokeWidth={30}
              strokeLinecap="round"
              fill="none"
              className="stroke-ink"
            />
            <circle
              cx={44}
              cy={-52}
              r={15}
              strokeWidth={2}
              className="fill-ink stroke-ink-foreground/40"
            />
          </motion.g>

          {/* Torso */}
          <rect
            x={530}
            y={300}
            width={100}
            height={130}
            rx={45}
            strokeWidth={3}
            className="fill-ink stroke-primary/60"
          />
          <path
            d="M540 312 Q580 332 620 312"
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
            className="stroke-primary-soft"
            opacity={0.85}
          />

          {/* Head */}
          <circle
            cx={580}
            cy={270}
            r={48}
            strokeWidth={3}
            className="fill-ink stroke-primary/60"
          />
          <circle
            cx={556}
            cy={280}
            r={7}
            className="fill-primary"
            opacity={0.5}
          />
          <circle
            cx={604}
            cy={280}
            r={7}
            className="fill-primary"
            opacity={0.5}
          />
          <path
            d="M557 250 Q565 244 574 249"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            className="stroke-ink-foreground/70"
          />
          <path
            d="M603 250 Q595 244 586 249"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            className="stroke-ink-foreground/70"
          />

          <motion.g style={{ opacity: c.blinkGateOpacity }}>
            <motion.circle
              cx={565}
              cy={265}
              r={4}
              className="fill-ink-foreground"
              style={{ transformOrigin: "565px 265px" }}
              animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{
                duration: 4.2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.86, 0.9, 0.94, 1],
              }}
            />
            <motion.circle
              cx={595}
              cy={265}
              r={4}
              className="fill-ink-foreground"
              style={{ transformOrigin: "595px 265px" }}
              animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{
                duration: 4.2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.86, 0.9, 0.94, 1],
              }}
            />
          </motion.g>

          <motion.path
            d="M562 285 Q580 296 598 285"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            className="stroke-ink-foreground"
            style={{ opacity: c.mouthNormalOpacity }}
          />
          <motion.path
            d="M558 283 Q580 307 602 283"
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
            className="stroke-ink-foreground"
            style={{ opacity: c.mouthWideOpacity }}
          />
        </motion.g>
      </motion.g>

      {/* Injection pulse rings — abstract, painless feedback at contact. */}
      {Array.from({ length: INJECTION_RING_COUNT }, (_, i) => (
        <InjectionPulseRing key={i} progress={progress} index={i} />
      ))}

      {/* Syringe */}
      <motion.g
        style={{ x: c.syringeX, y: c.syringeY, opacity: c.syringeOpacity }}
      >
        <ellipse
          cx={0}
          cy={12}
          rx={30}
          ry={7}
          className="fill-ink"
          opacity={0.2}
        />
        {/* Rotation about the needle tip (local origin) so the tip stays
            glued to the contact point while the barrel swings toward the
            stomach. */}
        <motion.g
          style={{ rotate: c.syringeRotate, transformOrigin: "0px 0px" }}
        >
          <motion.g className="will-change-transform" {...bob(3.2, 5)}>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-40}
              strokeWidth={2}
              className="stroke-ink-foreground"
            />
            <motion.circle
              cx={0}
              cy={2}
              r={3.5}
              className="fill-primary"
              style={{ scale: c.dropletScale }}
            />
            <rect
              x={-26}
              y={-140}
              width={52}
              height={100}
              rx={14}
              strokeWidth={3}
              className="fill-background stroke-foreground"
            />
            {[-110, -95, -80, -65, -50].map((ty) => (
              <line
                key={ty}
                x1={-26}
                y1={ty}
                x2={-18}
                y2={ty}
                strokeWidth={1.5}
                className="stroke-foreground"
                opacity={0.4}
              />
            ))}
            <motion.rect
              x={-18}
              width={36}
              rx={8}
              className="fill-primary"
              style={{ y: c.syringeLiquidY, height: c.syringeLiquidHeight }}
            />
            <rect
              x={-34}
              y={-146}
              width={10}
              height={14}
              rx={3}
              className="fill-foreground"
              opacity={0.85}
            />
            <rect
              x={24}
              y={-146}
              width={10}
              height={14}
              rx={3}
              className="fill-foreground"
              opacity={0.85}
            />
            <motion.g style={{ y: c.plungerY }}>
              <line
                x1={0}
                y1={-140}
                x2={0}
                y2={-172}
                strokeWidth={4}
                className="stroke-foreground"
              />
              <rect
                x={-16}
                y={-182}
                width={32}
                height={14}
                rx={6}
                className="fill-foreground"
              />
            </motion.g>
          </motion.g>
        </motion.g>
      </motion.g>

      {/* Celebration */}
      <motion.g style={{ opacity: c.celebrateOpacity }}>
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <SparkleStar key={i} progress={progress} index={i} />
        ))}
      </motion.g>
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <ConfettiHex key={i} progress={progress} index={i} />
      ))}
    </svg>
  );
}

/**
 * Shared caption bar for both motion drivers: the active phase's caption
 * slides up masked (LineReveal-style) whenever the active phase changes,
 * and a 4-segment progress indicator fills left-to-right underneath in
 * place of the old static dots.
 */
function PhaseCaptionBar({
  progress,
  className,
}: {
  progress: MotionValue<number>;
  className?: string;
}) {
  const activeIndex = useActivePhaseIndex(progress);

  return (
    <div
      className={cn(
        "glass-panel relative mt-4 w-full max-w-xl rounded-2xl px-6 py-4 shadow-lift",
        className,
      )}
    >
      <div className="relative h-6 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={activeIndex}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
            className="absolute inset-0 flex items-center justify-center text-center text-sm font-semibold text-foreground md:text-base"
          >
            {CAPTIONS[activeIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div aria-hidden className="mt-3 flex items-center gap-1.5">
        <SegmentFill progress={progress} index={0} />
        <SegmentFill progress={progress} index={1} />
        <SegmentFill progress={progress} index={2} />
        <SegmentFill progress={progress} index={3} />
      </div>
    </div>
  );
}

/** One fill segment of the caption bar's 4-segment progress indicator. */
function SegmentFill({
  progress,
  index,
}: {
  progress: MotionValue<number>;
  index: number;
}) {
  const start = PHASE_BOUNDS[index];
  const end = PHASE_BOUNDS[index + 1];
  const scaleX = useTransform(progress, [start, end], [0, 1], {
    clamp: true,
  });

  return (
    <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-foreground/15">
      <motion.span
        className="block h-full origin-left rounded-full bg-primary"
        style={{ scaleX }}
      />
    </span>
  );
}

/**
 * The pinned scrollytelling stage (lg+, motion allowed). Scroll progress is
 * run through a spring before reaching the scene so the choreography lags
 * and settles instead of tracking the scrollbar 1:1 — the difference between
 * a stiff scrubber and something that feels directed.
 */
function DesktopPinnedStage() {
  const outerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.6,
  });

  return (
    <div ref={outerRef} className="relative hidden h-[300vh] lg:block">
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-grad-ink text-ink-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-mesh-glow-dark"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grain text-ink-foreground/[0.04]"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6">
          <div className="text-center">
            <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
              The process
            </Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold text-ink-foreground md:text-4xl">
              From vial to weekly routine
            </h2>
          </div>

          <DoseScene progress={progress} />
          <PhaseCaptionBar progress={progress} />

          <p className="mt-4 max-w-xl text-center text-xs leading-relaxed text-ink-foreground/60">
            Illustration for general education only. Treatment requires provider
            review, and no prescription is guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The dwell-then-advance timeline the mobile autoplay driver loops through. */
const MOBILE_TIMELINE = [0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1];
const MOBILE_TIMELINE_TIMES = [0, 0.16, 0.25, 0.41, 0.5, 0.66, 0.75, 1];

/**
 * Mobile/tablet autoplay driver (below lg, motion allowed) — the fix for the
 * "not animated at all on mobile" complaint. Renders the exact same
 * `DoseScene`, in normal document flow (no pin), with `progress` driven by a
 * looping timeline instead of scroll: it advances into each phase and dwells
 * there before moving on, like a short designed product video. Starts once
 * the stage scrolls into view and stops (and rewinds) when it scrolls out,
 * so it never runs off-screen.
 */
function MobileAutoplayStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.35 });
  const progress = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(progress, MOBILE_TIMELINE, {
      duration: 16,
      times: MOBILE_TIMELINE_TIMES,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 1.4,
    });
    return () => controls.stop();
  }, [inView, progress]);

  return (
    <div
      ref={stageRef}
      className="relative overflow-hidden bg-grad-ink px-6 py-16 text-ink-foreground md:px-10 lg:hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-mesh-glow-dark"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grain text-ink-foreground/[0.04]"
      />

      <div className="relative mx-auto flex max-w-xl flex-col items-center">
        <div className="text-center">
          <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
            The process
          </Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-bold text-ink-foreground">
            From vial to weekly routine
          </h2>
        </div>

        <DoseScene progress={progress} />
        <PhaseCaptionBar progress={progress} />

        <p className="mt-4 max-w-xl text-center text-xs leading-relaxed text-ink-foreground/60">
          Illustration for general education only. Treatment requires provider
          review, and no prescription is guaranteed.
        </p>
      </div>
    </div>
  );
}

/**
 * A static, simplified snapshot of the celebration phase — same shape
 * vocabulary as `DoseScene` (character, confetti) but with no motion at all.
 * Used as the entire reduced-motion fallback: no timers, no loops, no pin.
 */
function StaticCelebrationFrame({ className }: { className?: string }) {
  const confetti = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return {
      dx: Math.cos(angle) * 40,
      dy: Math.sin(angle) * 40,
      size: 5 + (i % 2) * 2,
    };
  });

  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden
      focusable="false"
      className={className}
    >
      <circle
        cx={172}
        cy={100}
        r={46}
        className="fill-primary"
        opacity={0.35}
      />

      <g>
        <path
          d="M158 118 Q120 122 100 138"
          strokeWidth={14}
          strokeLinecap="round"
          fill="none"
          className="stroke-ink"
        />
        <circle cx={100} cy={138} r={7} className="fill-ink" />
        <path
          d="M186 118 Q206 108 214 92"
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
          className="stroke-ink"
        />
        <circle cx={214} cy={92} r={6} className="fill-ink" />
        <rect
          x={150}
          y={110}
          width={44}
          height={56}
          rx={20}
          strokeWidth={2}
          className="fill-ink stroke-primary/60"
        />
        <circle
          cx={172}
          cy={96}
          r={20}
          strokeWidth={2}
          className="fill-ink stroke-primary/60"
        />
        <circle cx={165} cy={93} r={1.8} className="fill-ink-foreground" />
        <circle cx={179} cy={93} r={1.8} className="fill-ink-foreground" />
        <path
          d="M162 100 Q172 110 182 100"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          className="stroke-ink-foreground"
        />
      </g>

      {confetti.map((hex, i) => (
        <polygon
          key={i}
          points={hexPoints(hex.size)}
          transform={`translate(${172 + hex.dx} ${100 + hex.dy})`}
          className="fill-primary"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

/**
 * Reduced-motion fallback, all breakpoints: a single static frame (the
 * celebration beat) plus the four captions as a plain list and the
 * footnote. No timers, no scroll listeners, no loops.
 */
function ReducedMotionScene() {
  return (
    <div className="relative bg-grad-ink px-6 py-16 text-ink-foreground md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-mesh-glow-dark"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grain text-ink-foreground/[0.04]"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
          The process
        </Eyebrow>
        <h2 className="mt-4 text-balance text-3xl font-bold text-ink-foreground md:text-4xl">
          From vial to weekly routine
        </h2>
      </div>

      <div className="relative mx-auto mt-10 max-w-md">
        <StaticCelebrationFrame className="mx-auto w-full max-w-[260px]" />

        <ol className="glass-panel mt-6 flex flex-col gap-3 rounded-2xl p-5 text-left">
          {CAPTIONS.map((text, i) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">
                <span className="mr-1 font-semibold text-primary">
                  {PHASE_TITLES[i]}.
                </span>
                {text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="relative mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-ink-foreground/60">
        Illustration for general education only. Treatment requires provider
        review, and no prescription is guaranteed.
      </p>
    </div>
  );
}

/**
 * The homepage's flagship scroll-driven scene: a pinned, hand-drawn SVG
 * scrollytelling sequence that walks through drawing and administering a
 * weekly GLP-1 dose, told entirely with transform/opacity/rect-size motion.
 *
 * Three renderings share one `DoseScene`:
 * - `lg`+, motion allowed: a pinned, spring-smoothed scroll driver.
 * - below `lg`, motion allowed: a normal-flow autoplay driver that loops a
 *   timeline once the stage is in view — the same scene, same captions, but
 *   actually animated on mobile.
 * - reduced motion, any breakpoint: a static single-frame fallback with no
 *   timers or loops.
 */
export function DoseJourney() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <section className="relative overflow-hidden">
        <ReducedMotionScene />
      </section>
    );
  }

  return (
    // overflow-x-clip (not overflow-hidden): an overflow-hidden ancestor
    // disables position:sticky, which un-pins the desktop stage and turns
    // its scroll runway into dead whitespace.
    <section className="relative overflow-x-clip">
      <DesktopPinnedStage />
      <MobileAutoplayStage />
    </section>
  );
}

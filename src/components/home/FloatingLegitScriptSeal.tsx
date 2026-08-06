import { motion, useReducedMotion, type Transition } from "motion/react";
import { EASE_OUT } from "@/components/home/home-motion";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { cn } from "@/lib/utils";

type FloatingLegitScriptSealProps = {
  /** Absolute positioning / visibility classes for this breakpoint. */
  className?: string;
  /** Optional tilt on the seal itself (e.g. `-rotate-6`). */
  sealClassName?: string;
};

const ENTRANCE_TRANSITION = (reduceMotion: boolean): Transition => ({
  duration: reduceMotion ? 0 : 0.55,
  delay: reduceMotion ? 0 : 1.2,
  ease: EASE_OUT,
});

const BOB_TRANSITION = (reduceMotion: boolean): Transition | undefined =>
  reduceMotion
    ? undefined
    : {
        duration: 4.6,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 1.7,
      };

/**
 * Shared floating seal for the homepage hero. Position/visibility and
 * optional tilt are the only per-placement knobs — animation comes from
 * here; link/size/asset come from `@/lib/legitscript` via `LegitScriptSeal`.
 */
export function FloatingLegitScriptSeal({
  className,
  sealClassName,
}: FloatingLegitScriptSealProps) {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <motion.div
      className={cn("absolute z-20", className)}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ENTRANCE_TRANSITION(reduceMotion)}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
        transition={BOB_TRANSITION(reduceMotion)}
      >
        <LegitScriptSeal className={sealClassName} />
      </motion.div>
    </motion.div>
  );
}

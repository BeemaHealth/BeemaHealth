import { useState, type MouseEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { EASE_OUT } from "@/components/home/home-motion";

type Origin = { x: number; y: number };

/** Ease-in mirror of EASE_OUT, for the circle collapsing back on close. */
const EASE_IN = [0.64, 0, 0.78, 0] as const;

/** Diameter (px) of the seed circle before it scales up to cover the viewport. */
const SEED_SIZE = 24;

/**
 * Full-screen circular-reveal menu. A filled circle grows from the
 * trigger's screen position until it covers the viewport, then the menu
 * content fades in on top of it; closing reverses the sequence (content
 * dismisses, then the circle collapses back to the trigger).
 *
 * Built directly on Radix Dialog (forceMount + AnimatePresence) rather than
 * the shared Sheet primitive - that keeps focus trap / ESC / scroll lock
 * intact while the entire visual transition is bespoke.
 */
export function CircleRevealMenu({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0 });
  const [targetScale, setTargetScale] = useState(1);

  function captureOrigin(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxX = Math.max(x, window.innerWidth - x);
    const maxY = Math.max(y, window.innerHeight - y);
    const coverRadius = Math.hypot(maxX, maxY);
    setOrigin({ x, y });
    // 2.1x buffer so the circle's edge clears the farthest viewport corner
    // with room to spare - no visible seam mid-animation.
    setTargetScale((coverRadius * 2.1) / SEED_SIZE);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild onClick={captureOrigin}>
        {trigger}
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content forceMount asChild aria-label="Menu">
              <motion.div
                className="fixed inset-0 z-[60]"
                initial="closed"
                animate="open"
                exit="closed"
              >
                <motion.div
                  aria-hidden
                  className="absolute rounded-full bg-grad-ink"
                  style={{
                    left: origin.x,
                    top: origin.y,
                    width: SEED_SIZE,
                    height: SEED_SIZE,
                    x: "-50%",
                    y: "-50%",
                  }}
                  variants={{
                    closed: {
                      scale: 0,
                      transition: {
                        duration: reduceMotion ? 0 : 0.4,
                        delay: reduceMotion ? 0 : 0.15,
                        ease: EASE_IN,
                      },
                    },
                    open: {
                      scale: targetScale,
                      transition: {
                        duration: reduceMotion ? 0 : 0.55,
                        ease: EASE_OUT,
                      },
                    },
                  }}
                />

                <motion.div
                  className="relative z-10 flex h-full flex-col overflow-y-auto"
                  variants={{
                    closed: {
                      opacity: 0,
                      y: 12,
                      transition: { duration: reduceMotion ? 0 : 0.2 },
                    },
                    open: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: reduceMotion ? 0 : 0.35,
                        delay: reduceMotion ? 0 : 0.5,
                      },
                    },
                  }}
                >
                  <Dialog.Close
                    aria-label="Close menu"
                    className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full text-ink-foreground/80 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
                  >
                    <X className="size-5" aria-hidden />
                  </Dialog.Close>
                  {children}
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Eyebrow,
  InfinityMotif,
  MagneticButton,
} from "@/components/site/primitives";
import { LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";

/**
 * Dark "why the bee" band — a full-width bg-grad-ink surface inside the
 * homepage's contained width, with a drifting mesh glow and a large
 * scroll-traced infinity motif (the bee's wings) behind the copy.
 */
export function MissionSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="veya-container">
        <div className="relative overflow-hidden rounded-4xl bg-grad-ink px-6 py-14 text-ink-foreground md:px-14 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-mesh-glow-dark mesh-drift-reverse"
          />
          <InfinityMotif
            animateDraw
            className="float-slow pointer-events-none absolute -right-16 bottom-0 w-[28rem] text-primary/25 md:w-[34rem]"
          />

          <div className="relative max-w-2xl">
            <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
              Why the bee?
            </Eyebrow>

            <h2 className="mt-6 text-3xl font-bold text-ink-foreground md:text-5xl">
              <LineReveal>The best healthcare works in harmony </LineReveal>
              <LineReveal delay={0.1}>with nature.</LineReveal>
            </h2>

            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-foreground/75 md:text-lg">
              Our bee represents natural effectiveness, trust, and consistency.
              Its infinity-shaped wings are a reminder that health isn&apos;t a
              finish line, but a lifelong journey.
            </p>

            <MagneticButton className="mt-8">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
              >
                <Link to="/about">
                  Our story
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

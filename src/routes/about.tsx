import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalUrl } from "@/lib/seo";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  Heart,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Eyebrow,
  HexBadge,
  HexMotif,
  InfinityMotif,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Beema Health" },
      {
        name: "description",
        content:
          "Health isn't a destination, it's a lifelong journey. The story behind Beema Health's bee, infinity wings, and hexagon — and what they mean for your care.",
      },
      { property: "og:title", content: "About — Beema Health" },
      {
        property: "og:description",
        content:
          "Purpose, trust, community, health, and consistency — the values behind Beema Health telehealth care.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/about") }],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    icon: Target,
    title: "Purpose",
    text: "Every action serves a purpose — from intake questions to provider review to order fulfillment.",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    text: "Licensed clinicians make independent medical decisions… always.",
  },
  {
    icon: Users,
    title: "Community",
    text: "Patients, providers, and technology work in harmony toward the objective.",
  },
  {
    icon: Heart,
    title: "Health",
    text: "Care measured in outcomes, not just prescriptions filled.",
  },
  {
    icon: RefreshCcw,
    title: "Consistency",
    text: "Professional support that continues from the first visit to success.",
  },
];

function AboutPage() {
  const reduceMotion = useReducedMotion();

  // Single decorative scroll-parallax accent for the page: the infinity
  // motif in the "Infinity wings" section drifts slightly as it scrolls
  // through view. Transform-only, aria-hidden, no layout impact.
  const wingsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: wingsProgress } = useScroll({
    target: wingsRef,
    offset: ["start end", "end start"],
  });
  const wingsY = useTransform(
    wingsProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -28],
  );

  return (
    <MarketingLayout>
      {/* Hero */}
      <Section className="bg-grad-hero relative overflow-hidden">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <HexMotif className="float-slow pointer-events-none absolute -right-16 top-8 z-0 hidden w-56 text-primary/15 lg:block" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
          >
            <Eyebrow>Our story</Eyebrow>
          </motion.div>
          <h1 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            <LineReveal>Health isn&apos;t a destination. </LineReveal>
            <LineReveal delay={0.1}>It&apos;s a lifelong journey.</LineReveal>
          </h1>
          <motion.p
            className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
            initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 0.3,
              ease: EASE_OUT,
            }}
          >
            The bee with its infinity wings, and the hexagon — every piece of
            our logo speaks to how we believe healthcare should function.
          </motion.p>
        </div>
      </Section>

      {/* Mission — black band, honey accents */}
      <Section className="pt-0">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT }}
        >
          <div className="bg-grad-ink relative overflow-hidden rounded-4xl px-6 py-14 text-ink-foreground md:px-16 md:py-20">
            <div
              aria-hidden
              className="bg-mesh-glow-dark mesh-drift-reverse pointer-events-none absolute inset-0"
            />
            <InfinityMotif
              animateDraw
              className="float-slow pointer-events-none absolute -right-12 -top-8 w-80 text-primary/12"
            />
            <HexMotif className="float-slower pointer-events-none absolute -bottom-16 -left-14 w-64 text-primary/10" />
            <div className="relative mx-auto max-w-2xl space-y-6 text-pretty leading-relaxed text-ink-foreground/85">
              <Eyebrow className="border-primary/40 bg-primary/10 text-primary">
                Mission
              </Eyebrow>
              <p className="text-xl font-semibold text-ink-foreground md:text-2xl">
                At Beema Health, we believe the best healthcare should work in
                harmony with nature.
              </p>
              <p>
                Honey bees are among nature's most efficient builders. Every
                action serves a purpose. Every member contributes to something
                greater than themselves. Together, they create thriving
                communities.
              </p>
              <p>That's how we believe healthcare should work.</p>
              <p>
                Our bee represents effectiveness, trust, and collaboration. The
                infinity-shaped wings symbolize lifelong wellness, because
                health isn't a finish line, it's a continuous journey. The
                hexagon reflects efficiency and strength, inspired by one of
                nature's most perfect designs.
              </p>
              <p>
                At Beema Health, our mission is simple: connect patients and
                providers through technology to deliver care that's more
                intelligent, more personal, and built for lifelong results.
              </p>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Five pillars */}
      <Section className="pt-0">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            eyebrow="What the bee means"
            title="Five pillars, one objective"
          />
        </motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              className="h-full"
              initial={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: 32,
                      rotate: i % 2 === 0 ? -1.5 : 1.5,
                    }
              }
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{
                duration: reduceMotion ? 0 : 0.55,
                delay: reduceMotion ? 0 : i * 0.1,
                ease: EASE_OUT,
              }}
            >
              <SurfaceCard className="flex h-full flex-col items-start p-6">
                <HexBadge className="size-11">
                  <p.icon className="size-5" />
                </HexBadge>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.text}
                </p>
              </SurfaceCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Infinity wings */}
      <Section className="bg-muted/40 pt-0">
        <div ref={wingsRef} className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.65, ease: EASE_OUT }}
          >
            <Eyebrow>Infinity wings</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
              Health doesn't have a finish line
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              The infinity shape in our wings is a reminder that wellness
              doesn't end at a prescription. It's why we build for
              follow-through — refill coordination, ongoing check-ins, and a
              care team that stays available to you long after your first visit.
            </p>
          </motion.div>
          <motion.div
            initial={
              reduceMotion ? undefined : { opacity: 0, y: 28, scale: 0.94 }
            }
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.65,
              delay: reduceMotion ? 0 : 0.14,
              ease: EASE_OUT,
            }}
            className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center"
          >
            <motion.div
              aria-hidden
              style={reduceMotion ? undefined : { y: wingsY }}
              className="w-3/4"
            >
              <InfinityMotif
                animateDraw
                className="float-slow w-full text-primary"
              />
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* Hexagon — efficiency */}
      <Section className="pt-0">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={
              reduceMotion ? undefined : { opacity: 0, y: 28, scale: 0.94 }
            }
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.65, ease: EASE_OUT }}
            className="order-2 lg:order-1"
          >
            <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
              <HexMotif className="float-slower w-3/4 text-primary" />
              <Sparkles className="absolute size-10 text-accent-foreground" />
            </div>
          </motion.div>
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.65,
              delay: reduceMotion ? 0 : 0.14,
              ease: EASE_OUT,
            }}
            className="order-1 lg:order-2"
          >
            <Eyebrow>Hexagon</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
              Nature's most efficient shape
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Hexagons tile perfectly with zero wasted space — the same
              principle we apply to your care. Minimal steps, no unnecessary
              friction, from eligibility check to provider review to success.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="pt-0">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: EASE_OUT }}
        >
          <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
            <div
              aria-hidden
              className="bg-mesh-primary-depth mesh-drift pointer-events-none absolute inset-0"
            />
            <HexMotif className="float-slow pointer-events-none absolute -left-10 -bottom-14 w-44 text-primary-foreground/10" />
            <HexMotif className="float-slower pointer-events-none absolute -right-8 -top-12 w-36 text-primary-foreground/10" />
            <div className="relative">
              <h2 className="text-3xl font-bold">
                Ready to start your journey?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
                The eligibility check takes about 5 minutes. No payment
                required, and no prescription is guaranteed.
              </p>
              <MagneticButton className="mt-8">
                <Button
                  asChild
                  size="xl"
                  className="bg-ink text-ink-foreground hover:bg-ink/85"
                >
                  <Link to={QUALIFY_PATH} search={qualifySearch(CTA_IDS.about)}>
                    See if you qualify <ArrowRight />
                  </Link>
                </Button>
              </MagneticButton>
            </div>
          </div>
        </motion.div>
      </Section>
    </MarketingLayout>
  );
}

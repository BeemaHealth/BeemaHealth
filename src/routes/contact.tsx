import { useEffect, useRef } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Mail, MessageCircle } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  HexMotif,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";
import { WAITLIST_CTA_LABEL } from "@/lib/marketing-copy";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Beema Health" },
      {
        name: "description",
        content:
          "Questions about eligibility, pricing, or your care? Reach the Beema Health support team. For emergencies, call 911.",
      },
      { property: "og:title", content: "Contact | Beema Health" },
      {
        property: "og:description",
        content: "Get in touch with the Beema Health care team.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/contact") }],
  }),
  component: ContactPage,
});

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    title: "Email support",
    text: "For questions about eligibility, pricing, account access, or your intake.",
    action: "support@beemahealth.com",
    href: "mailto:support@beemahealth.com",
  },
  {
    icon: Clock,
    title: "Business hours",
    text: "Monday to Friday, 9 AM to 5 PM MT. We'll respond to messages within one business day.",
    action: null,
    href: null,
  },
];

function ContactPage() {
  useEffect(() => {
    trackPageViewed("contact");
  }, []);

  const reduceMotion = useReducedMotion();

  // Single scroll-linked decorative accent for the cards section.
  const gridRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ["start end", "end start"],
  });
  const hexY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -60],
  );

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero py-16 md:py-24">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <HexMotif className="float-slow pointer-events-none absolute -left-10 top-8 z-0 hidden w-28 text-primary/15 md:block" />
        <HexMotif className="float-slower pointer-events-none absolute -right-8 bottom-2 z-0 hidden w-36 text-primary/10 md:block" />

        <div className="veya-container relative z-10">
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title={<LineReveal>We&apos;re here to help</LineReveal>}
            description="Questions before you start? Reach out, or begin your eligibility check to see if Beema Health may be a fit."
          />
        </div>
      </section>

      <Section className="pt-0">
        <div ref={gridRef} className="relative">
          <motion.div
            aria-hidden
            style={reduceMotion ? undefined : { y: hexY }}
            className="pointer-events-none absolute -right-6 -top-4 z-0 hidden lg:block"
          >
            <HexMotif className="w-16 text-primary/15" />
          </motion.div>

          <div className="relative grid gap-6 md:grid-cols-3">
            {CONTACT_OPTIONS.map((c, index) => (
              <motion.div
                key={c.title}
                className="h-full"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.55,
                  delay: reduceMotion ? 0 : index * 0.08,
                  ease: EASE_OUT,
                }}
                whileHover={
                  reduceMotion
                    ? undefined
                    : { y: -6, transition: { duration: 0.25, ease: EASE_OUT } }
                }
              >
                <SurfaceCard className="flex h-full flex-col">
                  <c.icon className="size-6 text-accent-foreground" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {c.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {c.text}
                  </p>
                  {c.action && c.href && (
                    <div className="mt-4">
                      <a
                        href={c.href}
                        className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
                      >
                        {c.action}
                      </a>
                    </div>
                  )}
                </SurfaceCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.55,
              ease: EASE_OUT,
            }}
          >
            <SurfaceCard className="mt-6 border-destructive/30 bg-destructive/5">
              <h3 className="text-base font-semibold text-foreground">
                Medical emergencies
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Beema Health does not provide emergency care. If you are
                experiencing a medical emergency, call{" "}
                <strong className="text-foreground">911</strong> or go to your
                nearest emergency room.
              </p>
            </SurfaceCard>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.55,
              ease: EASE_OUT,
            }}
          >
            <p className="max-w-lg text-sm text-muted-foreground">
              Many common questions are answered on our FAQ and Safety pages.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <MagneticButton>
                <Button asChild variant="outline">
                  <Link to="/faq/">Read FAQ</Link>
                </Button>
              </MagneticButton>
              <MagneticButton>
                <Button asChild size="xl">
                  <Link
                    to={QUALIFY_PATH}
                    search={qualifySearch(CTA_IDS.contact)}
                  >
                    {WAITLIST_CTA_LABEL} <ArrowRight />
                  </Link>
                </Button>
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      </Section>
    </MarketingLayout>
  );
}

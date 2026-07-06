import { useEffect } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Mail, MessageCircle } from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Beema Health" },
      {
        name: "description",
        content:
          "Questions about eligibility, pricing, or your care? Reach the Beema Health support team. For emergencies, call 911.",
      },
      { property: "og:title", content: "Contact — Beema Health" },
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
    action: "support@beemahealth",
    href: "mailto:support@beemahealth",
  },
  {
    icon: MessageCircle,
    title: "Already a patient?",
    text: "Log in to your dashboard for intake status and care updates.",
    action: "Go to dashboard",
    href: "/dashboard",
    internal: true,
  },
  {
    icon: Clock,
    title: "Response time",
    text: "We typically respond within one business day. Messages are not monitored 24/7.",
    action: null,
    href: null,
  },
];

function ContactPage() {
  useEffect(() => {
    trackPageViewed("contact");
  }, []);
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Contact"
          title="We're here to help"
          description="Questions before you start? Reach out — or begin your eligibility check to see if Beema Health may be a fit."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {CONTACT_OPTIONS.map((c) => (
            <SurfaceCard key={c.title} className="flex h-full flex-col">
              <c.icon className="size-6 text-accent-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {c.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {c.text}
              </p>
              {c.action && c.href && (
                <div className="mt-4">
                  {c.internal ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={c.href}>{c.action}</Link>
                    </Button>
                  ) : (
                    <a
                      href={c.href}
                      className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
                    >
                      {c.action}
                    </a>
                  )}
                </div>
              )}
            </SurfaceCard>
          ))}
        </div>

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

        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="max-w-lg text-sm text-muted-foreground">
            Many common questions are answered on our FAQ and Safety pages.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/faq">Read FAQ</Link>
            </Button>
            <Button asChild size="xl">
              <Link to={qualifyHref(CTA_IDS.contact)}>
                See if you qualify <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}

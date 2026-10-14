import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Eyebrow,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import {
  GROWTH_PROGRAMS_INDEXABLE,
  GROWTH_PROGRAM_ACTION_URLS,
  CREATOR_TERMS_PATH,
  REFERRAL_TERMS_PATH,
  STORY_TERMS_PATH,
  type GrowthProgramId,
} from "@/lib/growth-programs";
import { canonicalUrl } from "@/lib/seo";

/** Shared <head> pieces for the three program landing pages. */
export function growthProgramHead(args: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    meta: [
      { title: args.title },
      { name: "description", content: args.description },
      { property: "og:title", content: args.title },
      { property: "og:description", content: args.description },
      ...(GROWTH_PROGRAMS_INDEXABLE
        ? []
        : [{ name: "robots", content: "noindex" }]),
    ],
    links: [{ rel: "canonical", href: canonicalUrl(args.path) }],
  };
}

export function ProgramHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Section className="bg-grad-hero relative overflow-hidden">
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {description}
        </p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </Section>
  );
}

/**
 * Primary action. Links out to the configured destination; when none is live
 * yet, falls back to a support email rather than faking an in-site flow.
 */
export function ProgramActionButton({
  program,
  label,
  fallbackLabel,
  fallbackSubject,
}: {
  program: GrowthProgramId;
  label: string;
  fallbackLabel: string;
  fallbackSubject: string;
}) {
  const url = GROWTH_PROGRAM_ACTION_URLS[program];
  if (url) {
    return (
      <Button asChild size="lg">
        <a href={url} rel="noopener">
          {label}
          <ArrowRight className="size-5" aria-hidden />
        </a>
      </Button>
    );
  }
  return (
    <Button asChild size="lg">
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(fallbackSubject)}`}
      >
        {fallbackLabel}
        <ArrowRight className="size-5" aria-hidden />
      </a>
    </Button>
  );
}

export function ProgramSteps({
  heading,
  steps,
}: {
  heading: string;
  steps: readonly { icon: LucideIcon; title: string; text: string }[];
}) {
  return (
    <Section>
      <SectionHeading title={heading} />
      <ol className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <SurfaceCard className="h-full">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </SurfaceCard>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function ProgramBullets({
  heading,
  items,
}: {
  heading: string;
  items: readonly string[];
}) {
  return (
    <Section className="pt-0">
      <SurfaceCard className="mx-auto max-w-3xl">
        <h2 className="text-xl font-bold text-foreground md:text-2xl">
          {heading}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SurfaceCard>
    </Section>
  );
}

export function ProgramFaq({
  items,
}: {
  items: readonly { q: string; a: string }[];
}) {
  return (
    <Section className="pt-0">
      <SectionHeading title="Frequently asked questions" />
      <div className="mx-auto mt-8 max-w-3xl divide-y divide-border rounded-3xl border border-border bg-card">
        {items.map((item) => (
          <details key={item.q} className="group px-6 py-4">
            <summary className="cursor-pointer list-none text-base font-semibold text-foreground">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function ProgramDisclosure({
  children,
  termsPath,
  termsLabel,
}: {
  children: ReactNode;
  termsPath:
    | typeof STORY_TERMS_PATH
    | typeof REFERRAL_TERMS_PATH
    | typeof CREATOR_TERMS_PATH;
  termsLabel: string;
}) {
  return (
    <Section className="pt-0">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-muted/50 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        {children}{" "}
        <Link
          to={termsPath}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {termsLabel}
        </Link>
      </div>
    </Section>
  );
}

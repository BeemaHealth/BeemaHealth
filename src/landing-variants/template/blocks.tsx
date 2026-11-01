import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { cn } from "@/lib/utils";
import { LAZY_SECTION } from "./LandingTemplate";

/**
 * Page-specific content blocks that sit between the shared template sections
 * (insert them with `insertAfter`). Copy lives in each page's variant file.
 */

/** A headed block of prose, e.g. "What is sildenafil?". */
export function ProseSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <Section className="pt-0">
      <SectionHeading
        align="left"
        eyebrow={eyebrow}
        title={title}
        className="mx-0 max-w-2xl"
      />
      <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </Section>
  );
}

export function EligibilityCard({
  intro,
  points,
  columns = 1,
}: {
  intro: string;
  points: readonly string[];
  columns?: 1 | 3;
}) {
  return (
    <SurfaceCard className="h-full">
      <h3 className="text-lg font-semibold text-foreground">
        Who may be eligible
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {intro}
      </p>
      <ul
        className={cn(
          "mt-5 gap-2",
          columns === 3 ? "grid sm:grid-cols-3" : "space-y-2",
        )}
      >
        {points.map((t) => (
          <li
            key={t}
            className="flex items-start gap-2 text-sm text-foreground"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
            {t}
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}

export type SafetyCard = { icon: LucideIcon; title: string; body: ReactNode };

/** "Safety and important information": two cards, required on every page. */
export function SafetySection({ cards }: { cards: readonly SafetyCard[] }) {
  return (
    <Section className={cn("bg-muted/40 pt-0", LAZY_SECTION)}>
      <SectionHeading
        align="left"
        title="Safety and important information"
        className="mx-0 max-w-2xl"
      />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {cards.map(({ icon: Icon, title, body }) => (
          <SurfaceCard key={title}>
            <div className="flex gap-4">
              <Icon className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </Section>
  );
}

/** Standard "Talk to your provider" body, shared by every page. */
export function TalkToProviderBody({ extra }: { extra: ReactNode }) {
  return (
    <>
      {extra} After you complete intake and pay, you can ask follow-up
      questions. Before then, email{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
        {SUPPORT_EMAIL}
      </a>
      . For more detail on eligibility and warning signs, see{" "}
      <Link to="/safety/" className="text-primary underline">
        Safety &amp; eligibility
      </Link>
      .
    </>
  );
}

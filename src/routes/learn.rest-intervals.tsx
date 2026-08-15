import { useEffect, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  medicalWebPageJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  MagneticButton,
  Section,
  SectionHeading,
} from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  INITIAL_RESEARCH_PATH,
  INITIAL_RESEARCH_TITLE,
} from "@/lib/learn/initial-research";
import {
  RESISTANCE_TRAINING_PATH,
  RESISTANCE_TRAINING_TITLE,
} from "@/lib/learn/resistance-training";
import {
  REST_INTERVALS_DATE_MODIFIED,
  REST_INTERVALS_DESCRIPTION,
  REST_INTERVALS_FAQ,
  REST_INTERVALS_PATH,
  REST_INTERVALS_REFERENCES,
  REST_INTERVALS_TITLE,
  REST_INTERVALS_TOC,
} from "@/lib/learn/rest-intervals";
import { cn } from "@/lib/utils";

const PAGE_TITLE = `${REST_INTERVALS_TITLE} | Beema Health`;
const BREADCRUMB_SHORT = "Rest intervals";

export const Route = createFileRoute("/learn/rest-intervals")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: REST_INTERVALS_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      {
        property: "og:description",
        content: REST_INTERVALS_DESCRIPTION,
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(REST_INTERVALS_PATH) }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
            {
              name: BREADCRUMB_SHORT,
              path: REST_INTERVALS_PATH,
            },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: REST_INTERVALS_TITLE,
            description: REST_INTERVALS_DESCRIPTION,
            path: REST_INTERVALS_PATH,
            reviewedByClinicalLead: true,
            dateModified: REST_INTERVALS_DATE_MODIFIED,
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(REST_INTERVALS_FAQ)),
      },
    ],
  }),
  component: RestIntervalsPage,
});

function Cite({ n }: { n: number | readonly number[] }) {
  const nums = typeof n === "number" ? [n] : [...n];
  return (
    <sup className="ml-0.5 text-[0.7em] font-medium text-primary">
      {nums.map((num, i) => (
        <span key={num}>
          {i > 0 ? "," : ""}
          <a
            href={`#ref-${num}`}
            className="underline-offset-2 hover:underline"
            aria-label={`Reference ${num}`}
          >
            [{num}]
          </a>
        </span>
      ))}
    </sup>
  );
}

function Callout({
  title,
  children,
  tone = "muted",
}: {
  title?: string;
  children: ReactNode;
  tone?: "muted" | "caution";
}) {
  return (
    <aside
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
        tone === "caution"
          ? "border-warning/40 bg-warning/10 text-foreground"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {title ? (
        <p className="mb-1.5 font-semibold text-foreground">{title}</p>
      ) : null}
      {children}
    </aside>
  );
}

function ArticleP({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
  );
}

function ArticleUl({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </ul>
  );
}

function ArticleOl({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </ol>
  );
}

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-foreground">{children}</h3>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function ArticleSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        <span className="mr-2 text-primary">{number}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ArticleTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <Table>{children}</Table>
    </div>
  );
}

function RestIntervalsPage() {
  const cta = resolveCta(CTA_IDS.learn_rest_intervals);

  useEffect(() => {
    trackPageViewed("learn_rest_intervals");
  }, []);

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero py-12 md:py-16">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <div className="veya-container relative z-10 max-w-3xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/learn/">Learn</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{BREADCRUMB_SHORT}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <SectionHeading
            as="h1"
            eyebrow="Evidence-based guide"
            title={REST_INTERVALS_TITLE}
            description="A cited educational guide on how long to rest between resistance-training sets for muscle, strength, and power, drawn from recent meta-analyses and the 2026 American College of Sports Medicine position stand."
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {REST_INTERVALS_DATE_MODIFIED}
          </p>
        </div>
      </section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <Callout title="Educational disclaimer" tone="caution">
            Educational content prepared for Beema Health. Beema Health does not
            practice medicine, prescribe, or dispense medications. Beema Health
            does not sell dietary supplements or training programs. All clinical
            decisions are made by independent licensed providers. This guide is
            for general educational purposes only and is not medical advice, a
            training prescription, or a guarantee of muscle gain, strength, or
            fat loss. Consult a licensed healthcare professional before starting
            a training program, especially if you have medical conditions, take
            prescription medications, or are recovering from injury.
          </Callout>

          <nav
            aria-label="Table of contents"
            className="rounded-2xl border border-border bg-background px-5 py-4"
          >
            <p className="text-sm font-semibold text-foreground">
              Table of contents
            </p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {REST_INTERVALS_TOC.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {index + 1}. {item.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ArticleSection
            id="defaults"
            number={1}
            title="What the evidence supports"
          >
            <ArticleP>
              For a healthy adult around 18-40 whose priority is preserving or
              building muscle, a practical default is about{" "}
              <Strong>2 minutes between sets</Strong>. About{" "}
              <Strong>3 minutes</Strong> is preferable for demanding compound
              lifts, heavy strength work, and power work when repetition
              quality, force, or velocity matters. About{" "}
              <Strong>1 minute</Strong> is useful for local muscular endurance,
              isolation work, and time-efficient training, but it is more likely
              to reduce repetitions, load, and movement velocity across
              successive hard sets
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              The best current hypertrophy meta-analysis found a small advantage
              to resting longer than 60 seconds, and did <Strong>not</Strong>{" "}
              detect an appreciable additional hypertrophy benefit once rest
              exceeded roughly 90 seconds
              <Cite n={1} />. That undercuts the old bodybuilding heuristic that
              short rests build more muscle because they create more lactate and
              a bigger growth-hormone response. Short rests do produce more
              metabolic stress and can produce larger transient endocrine
              responses, but those responses have not translated reliably into
              greater hypertrophy
              <Cite n={[5, 6]} />.
            </ArticleP>
            <ArticleP>
              The most convincing explanation for why very short rest can
              sometimes impair hypertrophy is not that longer rest is inherently
              anabolic. Additional recovery preserves subsequent-set
              performance. When set count is fixed, longer rest often means more
              high-quality work. When volume is experimentally equated, the
              hypertrophy gap can disappear
              <Cite n={[1, 3]} />.
            </ArticleP>
            <Callout title="Who this is for">
              Age, sex, training experience, body weight, medical conditions,
              medications, diet, sleep, injury status, and equipment are
              unspecified here. The tables below are defaults for generally
              healthy adults, not individualized medical or training
              prescriptions. For weekly volume, effort, protein, and sample
              programs, see{" "}
              <Link
                to={RESISTANCE_TRAINING_PATH}
                className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary hover:decoration-primary"
              >
                {RESISTANCE_TRAINING_TITLE}
              </Link>
              . If you are using a weight-loss medication, see the{" "}
              <Link
                to={INITIAL_RESEARCH_PATH}
                className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary hover:decoration-primary"
              >
                companion guide on traditional versus glucagon-like
                peptide-1-assisted weight loss
              </Link>
              . Trial findings for branded glucagon-like peptide-1 products
              approved by the United States Food and Drug Administration in that
              guide do <Strong>not</Strong> apply to compounded products, and
              this page does not claim that any medication preserves muscle.
            </Callout>

            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[8rem]">Outcome</TableHead>
                  <TableHead className="min-w-[8rem]">1-minute rest</TableHead>
                  <TableHead className="min-w-[8rem]">2-minute rest</TableHead>
                  <TableHead className="min-w-[8rem]">3-minute rest</TableHead>
                  <TableHead className="min-w-[9rem]">
                    Evidence-weighted choice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Effective, but more likely to compromise volume
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Excellent default
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Excellent; little evidence of added growth over 2 minutes
                    when volume is preserved
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 minutes; 3 minutes for demanding compounds
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Maximal strength
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Works, especially in novices, but can impair later-set
                    quality
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Good
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best of the three for heavy, high-quality work
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Power
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often inadequate
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Sufficient in some moderate-load protocols
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Safest for preserving maximal velocity
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Metabolic stress
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Highest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Intermediate
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Lowest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1 minute only if metabolic fatigue tolerance is the goal
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Repetition and volume preservation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Lowest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Good
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Highest or near-highest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Acute hormonal response
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often highest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Intermediate
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Lower
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Not a reason to choose rest duration
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Local muscular endurance
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Strong specificity
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Useful compromise
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Less time-efficient
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 1 minute
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Muscle-mass preservation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    No direct long-term advantage established; possible quality
                    penalty
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best general default
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best for heavy compound quality
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 minutes default; 3 minutes on compounds
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <Callout title="How certain this is">
              Confidence is high that longer rest preserves acute repetitions,
              load, and power better than very short rest. It is moderately high
              that more than 60 seconds is at least as good, and probably
              modestly better, for hypertrophy. It is lower for any claim of a
              uniquely optimal preservation interval, because direct multi-month
              maintenance trials comparing 1 versus 2 versus 3 minutes do not
              exist. The chronic hypertrophy literature is also small (mostly 5
              to 10 weeks), disproportionately male and young, and relatively
              sparse in trained subjects
              <Cite n={1} />.
            </Callout>
          </ArticleSection>

          <ArticleSection
            id="acute"
            number={2}
            title="Volume, fatigue, and later-set quality"
          >
            <ArticleP>
              The most reproducible acute effect is straightforward: shortening
              rest generally reduces the amount or quality of work that can be
              completed in subsequent hard sets. Longer rests permit more
              repetitions at a given load, smaller declines in repetition
              velocity, and a better ability to keep the prescribed load. With
              loads roughly 50-90% of one-repetition maximum, 3-5 minutes
              generally allowed more repetitions across multiple sets than
              shorter intervals
              <Cite n={12} />. Willardson and Burkett showed progressive volume
              reductions when rest was shortened during repeated 8-repetition
              maximum squat and bench-press sets
              <Cite n={9} />.
            </ArticleP>
            <ArticleP>
              The relationship is not perfectly linear. Moving from 30 seconds
              to 1 minute can matter substantially. Moving from 1 to 2 minutes
              frequently helps. Moving from 2 to 3 minutes sometimes helps but
              often gives diminishing returns. Singer et al. notes that
              differences in volume load tend to level off around comparisons of
              approximately 120 versus 180 seconds, which is one reason the
              hypertrophy meta-analysis failed to identify a convincing
              advantage for continually extending rest beyond roughly 90 seconds
              <Cite n={1} />. Multi-joint exercises that engage a large amount
              of muscle can demand longer recovery than smaller isolation
              exercises.
            </ArticleP>
            <H3>A concrete performance example</H3>
            <ArticleP>
              Longo et al. makes the magnitude concrete. Under a fixed three-set
              prescription, 180-second rest averaged{" "}
              <Strong>
                16.1 (standard deviation 5.2) repetitions versus 9.8 (standard
                deviation 2.9) with 60 seconds
              </Strong>
              . Quadriceps cross-sectional area increased 6.8% (effect size
              0.38) at 1 minute versus 13.1% (effect size 0.66) at 3 minutes.
              When extra sets were added to the short-rest condition so volume
              load matched, hypertrophy became 12.9% (effect size 0.63), and the
              difference essentially disappeared
              <Cite n={[1, 3]} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[10rem]">Condition</TableHead>
                  <TableHead className="min-w-[10rem]">
                    Reported repetitions across three sets
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Quadriceps cross-sectional area
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    1-minute rest, fixed three sets
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    9.8 (standard deviation 2.9)
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    6.8% (effect size 0.38)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    3-minute rest, fixed three sets
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    16.1 (standard deviation 5.2)
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    13.1% (effect size 0.66)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Short rest, volume matched
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Extra sets added to equalize work
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    12.9% (effect size 0.63)
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              That table should not be read as showing that 3 minutes is
              intrinsically twice as anabolic as 1 minute. It shows the
              performance pathway through which rest can influence the delivered
              training stimulus. When volume was compensated experimentally, the
              hypertrophy gap largely disappeared
              <Cite n={[1, 3]} />.
            </ArticleP>
            <H3>A simple model</H3>
            <ArticleOl>
              <li>
                Shorter rest (about 1 minute) leaves less recovery before the
                next set.
              </li>
              <li>
                Local and systemic fatigue rise, so repetitions, load, or
                velocity decline more.
              </li>
              <li>
                Lactate, rating of perceived exertion, and often a larger
                transient hormonal response also rise.
              </li>
              <li>
                If set count is fixed, quality or volume can fall, creating a
                small possible disadvantage for hypertrophy, strength, and
                power.
              </li>
              <li>
                Acute hormonal and metabolic signals are not reliable predictors
                of long-term muscle growth.
              </li>
              <li>
                Longer rest (about 2-3 minutes) preserves more high-quality
                mechanical work and removes a possible bottleneck
                <Cite n={[1, 6, 7]} />.
              </li>
            </ArticleOl>
            <ArticleP>
              Fatigue support goes beyond repetition counts. Hernández Davó et
              al. found that 1-minute rest during repeated bench throws produced
              greater perceived exertion, physiological disturbance, and power
              loss than 2- or 3-minute rest
              <Cite n={7} />. Senna et al. used volume-equated resistance
              exercise and found that 1-minute rest produced a larger creatine
              kinase response 12-24 hours later, and a more prolonged
              inflammatory response, than 3 minutes
              <Cite n={15} />. More disruption is not more hypertrophy. Shorter
              rest can generate more metabolic disruption and less muscle growth
              or acute anabolic signaling when it reduces later-set performance
              <Cite n={[1, 6]} />.
            </ArticleP>
            <H3>Hormones are a poor programming target</H3>
            <ArticleP>
              Buresh et al. found that 1-minute rests produced a larger hormonal
              response than 2.5-minute rests early in a 10-week program. That
              distinction diminished by week 5 and disappeared by week 10, and
              it did not predict superior strength or lean-tissue gains
              <Cite n={5} />. McKendry et al. found a more
              &ldquo;anabolic-looking&rdquo; circulating hormonal environment
              with 1-minute rests, but a smaller early myofibrillar
              protein-synthesis response than with 5 minutes
              <Cite n={6} />. The relevant practical question is which interval
              allows enough high-quality, sufficiently effortful mechanical
              loading without unnecessary fatigue, not which interval produces
              the biggest hormone spike
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              Power is particularly sensitive. In a direct crossover of 1, 2,
              and 3 minutes during five sets of eight bench-press throws at 40%
              of one-repetition maximum, 1 minute was inadequate, while 2 and 3
              minutes were not significantly different
              <Cite n={7} />. That does not prove 2 minutes is enough for every
              explosive lift. It suggests recovery has a threshold beyond which
              extra rest may add little for a given task.
            </ArticleP>
          </ArticleSection>

          <ArticleSection
            id="chronic"
            number={3}
            title="Hypertrophy, strength, and muscle preservation"
          >
            <H3>Hypertrophy</H3>
            <ArticleP>
              The best current conclusion is not that long rest builds muscle
              and short rest does not. Hypertrophy occurred in every rest
              category Singer et al. evaluated: 60 seconds or less, 61-119
              seconds, 120-179 seconds, and 180 seconds or more. Differences
              among categories were small relative to the overall effect of
              resistance training itself
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              When controlled comparisons were isolated, central estimates
              modestly favored rest longer than 60 seconds: standardized mean
              difference <Strong>0.13 for upper-arm hypertrophy</Strong> and{" "}
              <Strong>0.17 for quadriceps hypertrophy</Strong>. Credible
              intervals were broad enough to include trivial differences, so
              this is a probabilistic tendency, not proof of a large advantage.
              Singer et al. estimated an 88% probability that the thigh effect
              favored longer rest, but only a 54% probability that the
              difference exceeded their threshold for a &ldquo;small&rdquo;
              effect
              <Cite n={1} />. In practical terms, the likely difference between
              1 minute and a sufficiently long interval sits somewhere between
              negligible and small, not remotely enough to make rest more
              important than consistent training, progression, and adequate
              weekly stimulus.
            </ArticleP>
            <ArticleP>
              The more interesting finding is the apparent plateau. The
              meta-analysis did not detect appreciable additional hypertrophy
              when rest was extended beyond approximately 90 seconds, and its
              four-category model produced the highest non-controlled central
              estimate in the 61-119-second category rather than 180 seconds or
              more. Because those category estimates contain indirect
              comparisons and considerable heterogeneity, it would be wrong to
              declare 90 or 120 seconds a physiological optimum. They do argue
              against assuming that 3 minutes is categorically more hypertrophic
              than 2
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              Schoenfeld et al. 2016 is the principal counterweight. In 21
              resistance-trained young men, 8 weeks, three days per week, three
              sets of 8-12 repetitions across seven exercises, 3-minute rests
              outperformed 1-minute rests for squat and bench-press strength and
              produced greater muscle thickness at some sites, particularly
              anterior thigh
              <Cite n={4} />. The study is highly relevant to experienced
              lifters, but it compared only the extremes of 1 and 3 minutes. It
              does not tell us whether 2 minutes would have performed equally
              well.
            </ArticleP>
            <ArticleP>
              That is why 2 minutes performs so well as a practical compromise.
              Ahtiainen et al. compared 2- and 5-minute rests for 6 months in
              trained men while arranging the program so total work was broadly
              comparable. Strength, quadriceps cross-sectional area, and
              hormonal adaptation did not meaningfully diverge
              <Cite n={8} />. Combined with little evidence for additional
              hypertrophy above roughly 90 seconds, a universal 3-minute
              prescription for every hypertrophy set is hard to justify
              <Cite n={1} />.
            </ArticleP>
            <H3>Strength</H3>
            <ArticleP>
              Strength is more sensitive to rest because maximal-strength
              training depends on expressing and repeatedly practicing high
              force. Grgic et al.&apos;s systematic review concluded that robust
              strength gains are possible with short rest, but that longer rest,
              particularly more than 2 minutes, appears advantageous in
              resistance-trained individuals
              <Cite n={11} />. Acute work-capacity research likewise shows that
              long rests better preserve repetitions at heavy loads
              <Cite n={[9, 12]} />. The Schoenfeld trial demonstrated superior
              bench-press and squat one-repetition-maximum adaptation with 3
              minutes versus 1 minute in trained men
              <Cite n={4} />.
            </ArticleP>
            <ArticleP>
              Three minutes is not an absolute requirement for getting stronger.
              The American College of Sports Medicine 2026 umbrella review
              synthesized 137 systematic reviews covering more than 30,000
              participants and found that strength was not consistently altered
              when studies were broadly categorized as shorter than 1 minute
              versus longer than 1 minute. Heavier loading, greater volume, and
              training frequency were more consistently influential. Hypertrophy
              evidence for rest was classified as insufficient at that
              umbrella-review level
              <Cite n={2} />. Rest duration has a larger effect when it becomes
              a binding constraint: something that actually prevents the planned
              heavy work. If a person is ready after 2 minutes, adding a third
              minute probably does little. If 2 minutes leaves the trainee
              unable to reproduce the target force or repetitions, the extra
              minute is useful.
            </ArticleP>
            <ArticleP>
              There is a useful tension between syntheses. Singer et al.
              estimates a small hypertrophy advantage to rest longer than 60
              seconds, whereas the 2026 American College of Sports Medicine
              umbrella review classifies rest-and-hypertrophy evidence as
              insufficient. For strength, that umbrella review reports no
              consistent influence of short versus long rest even though the
              dedicated Grgic review and several trained-lifter studies favor
              longer intervals
              <Cite n={[1, 2, 11]} />. That is not necessarily a contradiction.
              Umbrella reviews apply conservative grading across entire reviews
              and broad binary categories. Dedicated rest-interval analyses can
              detect small, population-specific effects that may not survive an
              umbrella-review threshold.
            </ArticleP>
            <H3>Muscle preservation is inferred, not directly trialed</H3>
            <ArticleP>
              There is no direct evidence showing that 1-, 2-, or 3-minute rest
              uniquely prevents muscle loss over months or years. Singer&apos;s
              included hypertrophy trials lasted only about 5-10 weeks, and
              longer-term differences could be larger, smaller, or unchanged
              <Cite n={1} />. Maintenance research instead shows that the amount
              of training needed to retain muscle can be considerably lower than
              the amount used to maximize growth.
            </ArticleP>
            <ArticleP>
              Bickel et al. trained young adults aged 20-35 and older adults
              aged 60-75 for 16 weeks, three days per week, then followed them
              for 32 weeks of detraining or maintenance at one-third or
              one-ninth of the original dose. Both reduced doses maintained the
              preceding hypertrophy in the younger group. Older adults were less
              able to maintain myofiber hypertrophy at those reduced doses.{" "}
              <Strong>Rest interval was not manipulated</Strong>
              <Cite n={10} />.
            </ArticleP>
            <ArticleP>
              The logical implication is indirect: during a maintenance phase,
              the objective should be to preserve a meaningful mechanical
              stimulus efficiently, not to maximize metabolic fatigue. Because
              2-3-minute rests make it easier to preserve load and repetitions
              with fewer total sets, they are well suited to muscle maintenance.
              A 1-minute rest can still work if loads and repetitions remain
              adequate, but compressing rest makes less sense when the goal is
              the smallest sustainable training dose
              <Cite n={[1, 10, 11]} />.
            </ArticleP>
            <ArticleP>
              Older adults should not simply inherit this prescription. Singer
              et al. notes insufficient older-adult rest-interval data
              <Cite n={1} />. The National Strength and Conditioning Association
              older-adult position statement identifies resistance training as
              an important intervention against age-related strength and muscle
              loss, but there is not a current National Strength and
              Conditioning Association position statement devoted to 1-, 2-, or
              3-minute rest in healthy young adults
              <Cite n={14} />. The old 30-90 second hypertrophy convention is a
              programming convention, not a current rest-specific position
              statement. Singer et al. argues it warrants reconsideration
              <Cite n={1} />.
            </ArticleP>
          </ArticleSection>

          <ArticleSection
            id="compare"
            number={4}
            title="Comparing 1, 2, and 3 minutes"
          >
            <ArticleP>
              Compare these intervals by what each buys and costs, rather than
              assigning each to a simplistic hypertrophy, strength, or endurance
              category.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[7rem]">Rest interval</TableHead>
                  <TableHead className="min-w-[10rem]">
                    Primary advantages
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Primary disadvantages
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Hypertrophy interpretation
                  </TableHead>
                  <TableHead className="min-w-[10rem]">Best uses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    1 minute
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Time-efficient; high session density; high local metabolic
                    stress; useful fatigue-resistance stimulus
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Larger repetition and velocity decline; greater rating of
                    perceived exertion; can reduce volume or load; more
                    muscle-damage response in some protocols
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Builds muscle, with a small possible disadvantage versus
                    more than 60 seconds when fixed sets cause volume loss
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Isolation exercises, local endurance, circuits, low-fatigue
                    movements, time-constrained sessions
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    2 minutes
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Recovers much of lost performance; efficient; direct power
                    research shows it can match 3 minutes; little evidence that
                    more than about 90 seconds adds hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    May still be too short for heavy squats, deadlifts, presses,
                    or advanced lifters
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best general compromise for hypertrophy and preservation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Default hypertrophy work, moderate-load compounds, machines,
                    most accessory work, muscle maintenance
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    3 minutes
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best recovery of the three; preserves force, repetitions,
                    and velocity; strong fit for trained lifters and heavy
                    compounds
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Longer sessions; usually no proven extra hypertrophy versus
                    2 minutes when performance is already recovered
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Excellent; likely no meaningful hypertrophy disadvantage,
                    and potentially beneficial when 2 minutes limits volume
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Strength work, heavy compounds, high-effort hypertrophy
                    compounds, explosive training
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              The 1-minute case rests on efficiency and specificity. If a
              lateral raise, curl, calf raise, or machine exercise can be
              repeated after 1 minute without a substantial decline in
              productive repetitions, extending every rest to 3 minutes
              needlessly lengthens the session. Short rests are also useful in
              local muscular-endurance training, where tolerating repeated
              contractions under incomplete recovery is itself part of the
              desired adaptation
              <Cite n={16} />.
            </ArticleP>
            <ArticleP>
              What does not survive scrutiny is the claim that the metabolic
              burn of 1 minute makes it superior for hypertrophy. Singer&apos;s
              synthesis slightly favors more than 60 seconds. Schoenfeld
              observed greater adaptations with 3 versus 1 minute in trained
              men. Longo demonstrated a volume-mediated disadvantage to 1
              minute. McKendry found a smaller early myofibrillar
              protein-synthesis response despite the larger metabolic and
              hormonal response
              <Cite n={[1, 3, 4, 6]} />. One minute is a legitimate programming
              choice because it serves the exercise or time constraint, not
              because lactate is assumed to be an anabolic signal.
            </ArticleP>
            <ArticleP>
              There is no inconsistency in recommending 3 minutes for a barbell
              squat and 1-2 minutes for a cable curl in the same hypertrophy
              workout. Rest interval is an exercise-level variable that should
              reflect how much recovery is needed to reproduce the desired
              performance. After the prescribed minimum rest, begin the next set
              when breathing and local fatigue have recovered enough that
              anticipated repetition loss is reasonable and technique will stay
              stable. If a planned 10-repetition set becomes 5 solely because
              the timer says 60 seconds, the rest prescription is probably
              constraining training quality
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              Some repetition decline across hypertrophy sets is normal. The
              issue is disproportionate fatigue: losing so much performance that
              a large fraction of the session generates exhaustion rather than
              productive tension. Singer et al. found that whether sets reached
              failure did not meaningfully change the rest-duration and
              hypertrophy relationship, so taking every degraded short-rest set
              to absolute failure is not a proven compensation
              <Cite n={1} />.
            </ArticleP>
          </ArticleSection>

          <ArticleSection
            id="programming"
            number={5}
            title="Practical programming"
          >
            <ArticleP>
              For healthy adults aged 18-40, the following integrates
              rest-interval evidence with 2026 American College of Sports
              Medicine recommendations: train major muscles at least twice
              weekly; heavier loads around at least about 80% of one-repetition
              maximum and 2-3 sets per exercise when strength is the priority;
              roughly 10 hard sets per muscle group per week when optimizing
              hypertrophy; and about 30-70% of one-repetition maximum moved with
              maximal intended concentric velocity when power is the target
              <Cite n={2} />. These programs are practical implementations, not
              claims that one narrow combination is uniquely optimal. They are
              educational examples, not prescriptions.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[7rem]">Goal</TableHead>
                  <TableHead className="min-w-[9rem]">Primary rest</TableHead>
                  <TableHead className="min-w-[8rem]">Typical load</TableHead>
                  <TableHead className="min-w-[7rem]">
                    Repetitions per set
                  </TableHead>
                  <TableHead className="min-w-[7rem]">
                    Sets per exercise
                  </TableHead>
                  <TableHead className="min-w-[9rem]">
                    Weekly structure
                  </TableHead>
                  <TableHead className="min-w-[8rem]">Effort</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 minutes default; 3 minutes compounds; about 1 minute
                    low-fatigue isolation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Practically about 60-85% of one-repetition maximum, although
                    hypertrophy occurs over a wider load range
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 6-15 most often; higher repetitions are viable
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-4
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 10 hard sets per muscle per week as a starting target;
                    at least 2 exposures per week
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually about 1-3 repetitions in reserve; occasional failure
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Maximal strength
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 minutes
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 80-95% of one-repetition maximum
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1-6
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3-5 main-lift sets
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Main movement about 2-4 times per week depending on
                    experience
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Avoid unnecessary failure; preserve technique and bar speed
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Power
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes; lean toward 3 for demanding movements
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 30-70% of one-repetition maximum depending on exercise
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 2-6 explosive repetitions
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3-5
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 2-3 exposures per week
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Stop sets before meaningful velocity degradation
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Local muscular endurance
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 1 minute
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually under 60% of one-repetition maximum
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 15-30 or more
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-4
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 2-3 times per week
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    High effort is appropriate; manage technique
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Muscle preservation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 minutes; 3 minutes on compounds
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 60-85% of one-repetition maximum is efficient
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    About 5-12
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often about 1-2 sessions per muscle per week; materially
                    less volume than growth phases may suffice
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Keep sets genuinely challenging; preserve load
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <H3>Sample lower-body hypertrophy session</H3>
            <ArticleP>
              A defensible hypertrophy default is 2-3 minutes on large compounds
              and about 1-2 minutes on smaller isolation exercises
              <Cite n={1} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[10rem]">Exercise</TableHead>
                  <TableHead className="min-w-[8rem]">Example work</TableHead>
                  <TableHead className="min-w-[6rem]">Rest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Squat
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 sets of 6-10
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Leg press
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 sets of 8-12
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Leg curl
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 sets of 10-15
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Calf raise
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 or 3 sets of 10-20
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1-2 minutes
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <H3>Minimalist preservation workout</H3>
            <ArticleP>
              For a healthy trained adult under ordinary conditions, a practical
              inferred start is roughly 3-6 challenging sets per muscle per
              week, distributed over one or two sessions, with meaningful
              resistance and 2 minutes on most exercises (3 minutes on heavy
              compounds). That range is evidence-informed, not a rigorously
              proven universal minimum
              <Cite n={10} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[12rem]">Exercise</TableHead>
                  <TableHead className="min-w-[8rem]">Example work</TableHead>
                  <TableHead className="min-w-[6rem]">Rest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Squat or leg press
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 sets of 5-10
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Bench press or machine press
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 sets of 5-10
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Row or pulldown
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 sets of 6-12
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Hip hinge or hamstring movement
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2 sets of 6-12
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Optional delts, arms, or calves
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1-2 sets of 8-15
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1-2 minutes
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              Done once or twice weekly, such a program can deliver a
              substantial maintenance stimulus without the volume of a dedicated
              growth phase. Judge it by whether loads and repetition performance
              remain stable over time, not by adherence to a magical set count
              <Cite n={10} />.
            </ArticleP>
            <H3>Decision flow</H3>
            <ArticleOl>
              <li>
                What is the main goal?
                <ArticleUl>
                  <li>
                    Hypertrophy or muscle preservation: start at 2 minutes. If
                    the exercise is a heavy compound or repetitions drop sharply
                    at 2 minutes, use 3 minutes. If it is a small isolation
                    exercise and performance stays stable, 1-2 minutes is
                    reasonable.
                  </li>
                  <li>Maximal strength: use about 3 minutes.</li>
                  <li>
                    Power: use 2-3 minutes and preserve velocity. Stop the set
                    before meaningful speed loss.
                  </li>
                  <li>Local muscular endurance: use about 1 minute.</li>
                </ArticleUl>
              </li>
              <li>
                Rest long enough to protect the characteristic being trained:
                volume and tension for hypertrophy, force for strength, velocity
                for power, and incomplete-recovery tolerance for muscular
                endurance
                <Cite n={[1, 7, 11]} />.
              </li>
            </ArticleOl>
            <ArticleP>
              Training every hypertrophy set to absolute failure is unnecessary.
              The 2026 American College of Sports Medicine umbrella review did
              not find consistent additional hypertrophy from failure training
              <Cite n={2} />. Leaving roughly 1-3 repetitions in reserve on most
              compound sets is reasonable when it enables more high-quality
              work. For very heavy squats, deadlifts, presses, or advanced
              powerlifting, even longer than 3 minutes may sometimes be
              appropriate. Older American College of Sports Medicine progression
              guidance recommended 3-5 minutes for heavy strength and power work
              <Cite n={13} />. The 2026 position stand places less emphasis on a
              rigid rest prescription because pooled long-term evidence does not
              identify rest as one of the dominant determinants of strength
              <Cite n={2} />.
            </ArticleP>
            <ArticleP>
              <Strong>Most defensible conditional conclusion.</Strong> For
              healthy adults aged 18-40 seeking muscle hypertrophy or
              preservation, rest about 2 minutes between most working sets.
              Extend to about 3 minutes for heavy compound movements, strength
              work, explosive work, or any set where 2 minutes does not
              adequately restore performance. Use roughly 1 minute for
              low-fatigue isolation work, local muscular-endurance training, or
              when time efficiency is worth accepting some loss of
              subsequent-set performance. There is no compelling evidence that
              the larger metabolic or hormonal response produced by 1-minute
              rests makes them superior for hypertrophy
              <Cite n={[1, 5, 7]} />.
            </ArticleP>
            <ArticleP>
              For muscle preservation specifically, rest interval is subordinate
              to maintaining a sufficient training stimulus. The evidence does
              not establish a unique rest duration that prevents atrophy. Two to
              3 minutes is recommended because it makes limited maintenance
              volume easier to perform with high load and good repetition
              quality. In healthy young adults, surprisingly large reductions in
              training dose can preserve previously acquired hypertrophy for
              months, whereas older adults appear to require more continued
              loading
              <Cite n={10} />.
            </ArticleP>
            <Callout title="What remains uncertain">
              The most significant limitation is the scarcity of longitudinal
              evidence: nine qualifying hypertrophy studies in Singer et al.,
              most lasting 5-10 weeks, mostly young men, few trained subjects,
              and no direct 1-versus-2-versus-3-minute long-term preservation
              trials. A difference too small to detect over eight weeks could
              conceivably accumulate over years, or trainees could adapt so that
              an initial difference disappears. Acute myofibrillar
              protein-synthesis, lactate, hormones, creatine kinase, and
              soreness are mechanistic endpoints rather than long-term outcomes.
              Volume load (sets times repetitions times load) is a convenient
              work measure, not a perfect proxy for the hypertrophic stimulus.
              Unspecified age, sex, training history, and medical status prevent
              a truly individualized optimum
              <Cite n={[1, 3, 6, 10, 15]} />.
            </Callout>
          </ArticleSection>

          <ArticleSection
            id="faq"
            number={6}
            title="Frequently Asked Questions"
          >
            <Accordion type="single" collapsible className="w-full">
              {REST_INTERVALS_FAQ.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${i}`}
                  className="mb-3 rounded-2xl border border-border bg-card px-5"
                >
                  <AccordionTrigger className="text-left text-base font-medium text-foreground">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ArticleSection>

          <ArticleSection id="references" number={7} title="References">
            <Accordion type="single" collapsible defaultValue="refs">
              <AccordionItem
                value="refs"
                className="rounded-2xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Full reference list ({REST_INTERVALS_REFERENCES.length}{" "}
                  sources)
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {REST_INTERVALS_REFERENCES.map((ref, i) => (
                      <li
                        key={ref.href}
                        id={`ref-${i + 1}`}
                        className="scroll-mt-28"
                      >
                        <a
                          href={ref.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
                        >
                          {ref.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ArticleSection>

          <div className="border-t border-border pt-10 text-center">
            <p className="text-sm text-muted-foreground">
              Ready to explore whether care may be appropriate for you?
            </p>
            <div className="mt-4">
              <MagneticButton>
                <Button asChild size="xl">
                  <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
                    {cta.label} <ArrowRight />
                  </Link>
                </Button>
              </MagneticButton>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Completing intake does not guarantee a prescription. See also{" "}
              <Link
                to={RESISTANCE_TRAINING_PATH}
                className="text-foreground underline-offset-2 hover:underline"
              >
                {RESISTANCE_TRAINING_TITLE}
              </Link>
              ,{" "}
              <Link
                to={INITIAL_RESEARCH_PATH}
                className="text-foreground underline-offset-2 hover:underline"
              >
                {INITIAL_RESEARCH_TITLE}
              </Link>
              ,{" "}
              <Link
                to="/recipes/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                protein-forward recipes
              </Link>
              , and{" "}
              <Link
                to="/safety/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                Safety &amp; eligibility
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}

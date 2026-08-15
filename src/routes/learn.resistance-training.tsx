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
  REST_INTERVALS_PATH,
  REST_INTERVALS_TITLE,
} from "@/lib/learn/rest-intervals";
import {
  RESISTANCE_TRAINING_DATE_MODIFIED,
  RESISTANCE_TRAINING_DESCRIPTION,
  RESISTANCE_TRAINING_FAQ,
  RESISTANCE_TRAINING_PATH,
  RESISTANCE_TRAINING_REFERENCES,
  RESISTANCE_TRAINING_TITLE,
  RESISTANCE_TRAINING_TOC,
} from "@/lib/learn/resistance-training";
import { cn } from "@/lib/utils";

const PAGE_TITLE = `${RESISTANCE_TRAINING_TITLE} | Beema Health`;
const BREADCRUMB_SHORT = "Resistance training";

export const Route = createFileRoute("/learn/resistance-training")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: RESISTANCE_TRAINING_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      {
        property: "og:description",
        content: RESISTANCE_TRAINING_DESCRIPTION,
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(RESISTANCE_TRAINING_PATH) }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
            {
              name: BREADCRUMB_SHORT,
              path: RESISTANCE_TRAINING_PATH,
            },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: RESISTANCE_TRAINING_TITLE,
            description: RESISTANCE_TRAINING_DESCRIPTION,
            path: RESISTANCE_TRAINING_PATH,
            reviewedByClinicalLead: true,
            dateModified: RESISTANCE_TRAINING_DATE_MODIFIED,
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(RESISTANCE_TRAINING_FAQ)),
      },
    ],
  }),
  component: ResistanceTrainingPage,
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

function ArticlePre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/50 px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
      {children}
    </pre>
  );
}

function ResistanceTrainingPage() {
  const cta = resolveCta(CTA_IDS.learn_resistance_training);

  useEffect(() => {
    trackPageViewed("learn_resistance_training");
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
            title={RESISTANCE_TRAINING_TITLE}
            description="A cited educational guide on resistance training, protein, and creatine for maintaining and growing muscle, drawn from the 2026 American College of Sports Medicine position stand and recent meta-analyses."
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {RESISTANCE_TRAINING_DATE_MODIFIED}
          </p>
        </div>
      </section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <Callout title="Educational disclaimer" tone="caution">
            Educational content prepared for Beema Health. Beema Health does not
            practice medicine, prescribe, or dispense medications, and does not
            sell dietary supplements. All clinical decisions are made by
            independent licensed providers. This guide is for general
            educational purposes only and is not medical advice, a training
            prescription, or a guarantee of muscle gain or fat loss. Consult a
            licensed healthcare professional before starting a training program
            or supplement, especially if you have medical conditions, take
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
              {RESISTANCE_TRAINING_TOC.map((item, index) => (
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
              The most defensible general prescription for maintaining and
              growing skeletal muscle is not a single repetition range, load, or
              failure strategy. Train each major muscle at least about twice per
              week, accumulate enough challenging weekly sets, take most work
              sets reasonably close to failure, progress over time, eat adequate
              protein, and consider creatine monohydrate if supplementation is
              desired and a clinician agrees it is appropriate for you
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              The American College of Sports Medicine&apos;s 2026 position
              stand, the first major update since 2009, synthesized 137
              systematic reviews covering more than 30,000 participants.
              Hypertrophy was particularly responsive to higher weekly volume,
              with roughly <Strong>10 sets per muscle group per week</Strong> as
              a useful population-level target. Complicated periodization and
              routinely training to momentary failure were not necessary for
              most healthy adults. The largest benefit comes from doing
              progressive resistance training consistently; fine-grained
              manipulation of equipment, periodization, and failure contributes
              less than adherence, effort, and sufficient volume
              <Cite n={1} />.
            </ArticleP>
            <ArticleP>
              A practical hypertrophy default is roughly{" "}
              <Strong>6-15 repetitions per set</Strong>, about{" "}
              <Strong>60-80% of one-repetition maximum</Strong>, mostly{" "}
              <Strong>1-3 repetitions in reserve</Strong>, and about{" "}
              <Strong>8-15 challenging sets per muscle per week</Strong>,
              usually spread over at least two sessions. That is an
              efficiency-oriented starting zone, not a biological magic range:
              lighter and heavier loads can also build muscle when sets are
              sufficiently hard
              <Cite n={[3, 4, 5]} />.
            </ArticleP>
            <Callout title="Who this is for">
              Age, sex, training experience, body weight, medical conditions,
              medications, diet, sleep, injury status, and equipment are
              unspecified here. The tables below are defaults for generally
              healthy adults, not individualized medical or training
              prescriptions. The American College of Sports Medicine emphasizes
              individualization rather than rigid universal rules
              <Cite n={1} />. If you are using a weight-loss medication, see the{" "}
              <Link
                to={INITIAL_RESEARCH_PATH}
                className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary hover:decoration-primary"
              >
                companion guide on traditional versus glucagon-like
                peptide-1-assisted weight loss
              </Link>{" "}
              for lean-mass context. Trial findings for branded glucagon-like
              peptide-1 products approved by the United States Food and Drug
              Administration in that guide do <Strong>not</Strong> apply to
              compounded products, and this page does not claim that any
              medication preserves muscle.
            </Callout>

            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[7rem]">Variable</TableHead>
                  <TableHead className="min-w-[10rem]">
                    Hypertrophy default
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Maintenance adjustment
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Load
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Mostly 60-80% of one-repetition maximum; broader range can
                    work
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Keep meaningful loading; cut sets before cutting effort
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Reps
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Mostly 6-15; useful work from about 5-30+ when hard enough
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Similar ranges; fewer total hard sets
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Effort
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Mostly 1-3 repetitions in reserve (about rating of perceived
                    exertion 7-9)
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Still 1-3 repetitions in reserve; maintenance sets should
                    not be easy
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Volume
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Start around 8-12 hard sets/muscle/week
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often well below growth volume; individualize
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Frequency
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually 2+ exposures per muscle per week
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1-2 can work; twice weekly is a conservative default
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Failure
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Selective, not routine
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually unnecessary
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Rest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes for demanding compounds; 1-2+ minutes for
                    isolation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Same principle
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Tempo
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Controlled lowering; intentional concentric without losing
                    form
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Same
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Progression
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Add repetitions, then load; add volume only when needed
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Hold load/repetitions/performance rather than chasing
                    constant progression
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Supplements
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Creatine plus adequate total protein first
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Same priorities
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
          </ArticleSection>

          <ArticleSection
            id="programming"
            number={2}
            title="Load, volume, frequency, rest, tempo, and progression"
          >
            <H3>Load and repetition range</H3>
            <ArticleP>
              Muscle can grow across a wide loading spectrum. A systematic
              review and network meta-analysis comparing low-, moderate-, and
              high-load resistance training performed to high effort found
              broadly similar hypertrophy across loading zones, while higher
              loads produced superior improvements in one-repetition-maximum
              strength
              <Cite n={[3, 4]} />. That is why &ldquo;8-12 repetitions&rdquo;
              should not be read as a biological hypertrophy boundary. Moderate
              loads are nevertheless an excellent default because they allow
              substantial mechanical tension without requiring either very long,
              uncomfortable high-repetition sets or repeated near-maximal
              loading. A review of loading recommendations similarly identified
              roughly 60-80% of one-repetition maximum and moderate repetitions
              as an efficient hypertrophy-oriented strategy
              <Cite n={5} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[7rem]">Loading zone</TableHead>
                  <TableHead className="min-w-[8rem]">
                    Typical repetitions
                  </TableHead>
                  <TableHead className="min-w-[8rem]">
                    Hypertrophy assessment
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Practical trade-off
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    ~30-50% of one-repetition maximum
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often 15-30+
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Effective when taken sufficiently close to failure
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    More local discomfort and cardiovascular fatigue; proximity
                    to failure matters more
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    ~50-65% of one-repetition maximum
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often 10-20
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Excellent
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Joint-friendly for many movements; efficient for isolation
                    exercises
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    ~65-80% of one-repetition maximum
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often 6-15
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best general-purpose default
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Efficient combination of tension, effort, and manageable
                    fatigue
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    ~80-90%+ one-repetition maximum
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often 1-6
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Can hypertrophy, especially with enough sets
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Better specificity for strength; more joint/skill demands
                    and fewer repetitions per set
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              These repetition estimates are approximate because the repetitions
              achievable at a percentage of one-repetition maximum vary by
              exercise, person, muscle group, and training history. The broader
              conclusion, that hypertrophy is possible over a large load range
              but maximal strength benefits disproportionately from heavier
              loading, is much better supported than any exact
              percentage-to-repetition conversion
              <Cite n={[3, 4, 1]} />.
            </ArticleP>

            <H3>Weekly volume</H3>
            <ArticleP>
              The newest dose-response evidence strengthens the case that volume
              matters and simultaneously undermines simplistic thresholds. A
              2026 meta-regression encompassing 67 studies and 2,058
              participants found a 100% posterior probability that the estimated
              volume slope was positive for hypertrophy: as weekly volume
              increased, muscle growth tended to increase. Crucially, the
              best-fitting models showed <Strong>diminishing returns</Strong>,
              so each additional set appears to buy progressively less
              adaptation
              <Cite n={2} />. The American College of Sports Medicine&apos;s
              approximately 10-set-per-muscle weekly recommendation should
              therefore be interpreted as a strong starting anchor, not as
              either a minimum requirement or an upper limit
              <Cite n={1} />.
            </ArticleP>
            <Callout title="How to read the volume curve">
              Expected hypertrophy generally rises as weekly hard-set volume
              rises, then flattens. More volume generally helps, but marginal
              returns diminish. That curve reflects the direction of the 2026
              meta-regression; the evidence does <Strong>not</Strong> establish
              one universally optimal number of sets
              <Cite n={2} />. The same analysis introduced
              &ldquo;fractional&rdquo; counting, where indirect work can be
              credited partially rather than treating every compound movement as
              either a full set or zero sets for a secondary muscle
              <Cite n={2} />.
            </Callout>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[9rem]">
                    Training status / purpose
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Starting weekly hard-set range per muscle
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Interpretation
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Maintenance
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often ~3-8
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    An intentionally conservative practical range; some people
                    can maintain with less
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Beginner growth
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~6-10
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually enough stimulus without unnecessary fatigue
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Intermediate growth
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~10-16
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Strong default once novice gains slow
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Advanced growth
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~10-16 baseline; ~14-20 for selected priority muscles when
                    tolerated
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    More is not automatically better just because the lifter is
                    advanced
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              The exact numerical bands above are programming syntheses rather
              than directly proven biological cutoffs. The high-confidence
              findings are that multiple sets generally outperform very low
              volume for hypertrophy, around 10 weekly sets is a reasonable
              population-level anchor, and further gains can occur above that
              level with diminishing returns
              <Cite n={[1, 2]} />.
            </ArticleP>
            <ArticleP>
              A key mistake is assuming an advanced lifter necessarily needs 20+
              sets for every muscle. An advanced lifter may instead be capable
              of extracting more stimulus from each set, while also using
              heavier absolute loads that increase systemic and
              connective-tissue fatigue. A better advanced strategy is to place
              higher volume selectively on muscles currently being prioritized
              and keep others closer to maintenance.
            </ArticleP>

            <H3>Frequency</H3>
            <ArticleP>
              When total volume is matched, frequency has a surprisingly modest
              independent effect on hypertrophy. A meta-analysis specifically
              addressing frequency found no meaningful hypertrophy advantage
              from increasing weekly frequency when volume was equated, and the
              2026 dose-response analysis likewise found frequency&apos;s
              independent hypertrophy effect compatible with negligible values
              <Cite n={[2, 10]} />. The American College of Sports Medicine
              nevertheless recommends training major muscles at least twice
              weekly
              <Cite n={1} />. These findings are not contradictory: twice-weekly
              training is a convenient way to distribute sufficient quality
              volume and avoid cramming 10-15 fatiguing sets for one muscle into
              a single session.
            </ArticleP>
            <ArticleP>
              Frequency is therefore primarily a{" "}
              <Strong>volume-distribution tool</Strong> for hypertrophy. Ten
              good weekly sets performed as five sets twice a week will usually
              be more practical than ten or fifteen consecutive sets in one
              session, even if frequency itself is not magically anabolic
              <Cite n={[2, 10]} />.
            </ArticleP>

            <H3>Rest intervals</H3>
            <ArticleP>
              A 2024 Bayesian systematic review and meta-analysis found a small
              tendency favoring rest periods longer than 60 seconds, plausibly
              because longer rest preserves repetitions and volume load. It
              found no compelling evidence that increasingly long rests beyond
              roughly 90 seconds continually improve hypertrophy
              <Cite n={11} />. A companion guide,{" "}
              <Link
                to={REST_INTERVALS_PATH}
                className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary hover:decoration-primary"
              >
                {REST_INTERVALS_TITLE}
              </Link>
              , covers the 1-versus-2-versus-3-minute comparison, strength and
              power, and inferred muscle-preservation defaults in more detail.
              In practice, exercise complexity matters enough that a useful
              default is:
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[12rem]">Exercise type</TableHead>
                  <TableHead className="min-w-[8rem]">Practical rest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Heavy squat, deadlift variation, bench, heavy row/press
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-4 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Moderate-load compound hypertrophy work
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Machine compound exercises
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~1.5-3 minutes
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Curls, extensions, lateral raises, calves
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~1-2 minutes, longer if performance is falling
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              The point is not to keep a stopwatch-perfect interval. Rest long
              enough that cardiovascular fatigue or residual exhaustion from the
              previous set is not substantially reducing muscular output on the
              next one. Forcing rests of 60 seconds or less for &ldquo;more
              metabolic stress&rdquo; is not necessary for hypertrophy and can
              be counterproductive if it markedly reduces productive training
              volume
              <Cite n={11} />.
            </ArticleP>

            <H3>Tempo</H3>
            <ArticleP>
              Current evidence gives little reason to deliberately slow every
              repetition. A 2025 systematic review and meta-analysis concluded
              that repetition tempo had minimal overall influence on
              hypertrophy, consistent with earlier evidence showing similar
              growth across a fairly broad range of repetition durations
              <Cite n={12} />. A good default is therefore to lower the weight
              under control (often roughly 1-3 seconds); avoid bouncing or
              losing position, and perform the concentric with high intent while
              maintaining technique. Extremely slow repetitions can reduce the
              load and repetitions achievable without a demonstrated hypertrophy
              advantage
              <Cite n={12} />.
            </ArticleP>

            <H3>Progression</H3>
            <ArticleP>
              Progressive overload does not mean adding weight every workout
              forever. It means that the stimulus must remain appropriately
              challenging as adaptation occurs. A simple and robust model is{" "}
              <Strong>double progression</Strong>: choose a repetition range,
              maintain approximately the target repetitions in reserve, add
              repetitions over successive sessions, then increase load when
              every prescribed set reaches the top of the range. Older American
              College of Sports Medicine progression guidance suggested
              increasing load roughly 2-10% once the lifter can exceed the
              intended repetition target
              <Cite n={20} />.
            </ArticleP>
            <ArticleP>
              For example, on a <code>3 x 8-12 @ 2 repetitions in reserve</code>{" "}
              incline press:
            </ArticleP>
            <ArticlePre>
              {`Week A:  60 pounds x 10, 9, 8
Week B:  60 pounds x 11, 10, 9
Week C:  60 pounds x 12, 11, 10
Week D:  60 pounds x 12, 12, 12
Then:    increase load and rebuild within 8-12 repetitions`}
            </ArticlePre>
            <ArticleP>
              The exact weekly pattern will rarely be this neat. The important
              outcome is a rising trend in repetitions, load, execution quality,
              or productive volume while effort remains comparable.
            </ArticleP>
            <ArticleP>
              More elaborate periodization can be useful for organizing
              training, particularly when strength and hypertrophy goals
              compete, but it should not be treated as mandatory. The American
              College of Sports Medicine&apos;s 2026 synthesis found that
              complex periodization did not consistently improve outcomes for
              the average healthy adult
              <Cite n={1} />.
            </ArticleP>
          </ArticleSection>

          <ArticleSection
            id="effort"
            number={3}
            title="Effort, repetitions in reserve, failure, and set-endpoint strategies"
          >
            <ArticleP>
              Getting reasonably close to failure matters for hypertrophy;
              reaching failure on every set is not necessary. A 2024
              meta-regression found muscle growth tended to increase as sets
              terminated closer to failure, while strength gains were relatively
              insensitive to estimated repetitions in reserve. The authors
              cautioned that the exact shape of that relationship remains
              uncertain
              <Cite n={13} />.
            </ArticleP>

            <ArticleP>
              An eight-week study in resistance-trained adults comparing about{" "}
              <Strong>1-2 repetitions in reserve</Strong> with momentary failure
              found similar quadriceps hypertrophy
              <Cite n={14} />. Broader reviews likewise do not establish a
              reliable hypertrophy advantage to mandatory momentary failure
              <Cite n={[1, 15, 17]} />. &ldquo;Closer to failure is generally
              more stimulative&rdquo; does not mean &ldquo;failure is
              optimal.&rdquo; The last repetition before failure can capture
              most of the useful high-effort stimulus while avoiding some of the
              fatigue, technique degradation, soreness, and performance loss
              created by repeatedly attempting another repetition.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[5rem]">
                    Rating of perceived exertion
                  </TableHead>
                  <TableHead className="min-w-[5rem]">
                    Approximate repetitions in reserve
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    Practical meaning
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    6
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~4+
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Quite easy; usually warm-up or low-fatigue technique work
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    7
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~3
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Productive but conservative
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    8
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~2
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Excellent default
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    9
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~1
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Very hard; highly useful
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    9.5
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~0-1
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Maybe one repetition, probably not
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    10
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    0
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    No additional complete repetition with acceptable technique
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              This rating of perceived exertion to repetitions in reserve
              mapping was developed specifically to translate perceived exertion
              into repetitions remaining
              <Cite n={16} />. Estimates are less reliable when lifters are
              inexperienced, when exercises are unfamiliar, or when the set is
              stopped for pain, fear, cardiovascular discomfort, grip, or
              technique rather than muscular capacity. That limitation is one
              reason beginner programming should not be built around obsessively
              precise rating of perceived exertion decimals.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[8rem]">Set strategy</TableHead>
                  <TableHead className="min-w-[8rem]">What it means</TableHead>
                  <TableHead className="min-w-[8rem]">Best use</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Momentary muscular failure
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Continue until another concentric repetition cannot be
                    completed with acceptable technique
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Selectively on final sets, machines, isolations
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Volitional exhaustion
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    The trainee elects to stop because continuing is perceived
                    as impossible or undesirable
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    High-repetition or lighter-load work when exact repetitions
                    in reserve is difficult
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Fixed-repetition sets
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Predetermine repetitions regardless of daily readiness, for
                    example, 3x10
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Beginners, provided load is adjusted periodically
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Rating of perceived exertion / repetitions in reserve-based
                    sets
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Stop at a target estimated proximity to failure
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Best general strategy for experienced trainees
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              Research terminology around &ldquo;failure,&rdquo;
              &ldquo;volitional failure,&rdquo; and related endpoints is not
              perfectly standardized, and systematic reviews have had to
              categorize studies by different failure definitions. That
              heterogeneity is one reason the literature cannot support an
              overly precise claim such as &ldquo;1.5 repetitions in reserve is
              optimal&rdquo;
              <Cite n={[15, 17]} />.
            </ArticleP>
            <ArticleP>
              Rating of perceived exertion-based autoregulation also should not
              be oversold. Its main value is pragmatic: a prescribed{" "}
              <code>8 repetitions @ 2 repetitions in reserve</code> adapts to
              whether today&apos;s 2-repetitions-in-reserve load is 185 pounds
              or 175 pounds. It has not been shown to have a unique hypertrophy
              advantage over well-designed percentage- or repetition-based
              programs
              <Cite n={16} />.
            </ArticleP>
            <ArticleUl>
              <li>
                <Strong>Compound free-weight exercises:</Strong> generally stop
                around <Strong>1-3 repetitions in reserve</Strong>. On squats,
                deadlift variations, heavy presses, and unsupported rows, the
                marginal gain from turning every set into a grinding failure
                attempt is poor relative to the fatigue and technical risk. The
                failure literature and the American College of Sports
                Medicine&apos;s 2026 review provide no justification for
                universal failure
                <Cite n={[1, 13]} />.
              </li>
              <li>
                <Strong>Machines and isolation movements:</Strong> approximately{" "}
                <Strong>0-2 repetitions in reserve</Strong> works well. Taking
                the last set of curls, leg extensions, lateral raises, machine
                presses, or similar stable movements to genuine failure is
                reasonable when tolerated, because the cost of failure is
                usually lower.
              </li>
              <li>
                <Strong>Very light loads / high repetitions:</Strong> train
                closer to failure. Low-load hypertrophy studies generally rely
                on very high effort; leaving many repetitions in reserve with a
                30-40% of one-repetition maximum load is much less defensible if
                hypertrophy is the goal
                <Cite n={4} />.
              </li>
              <li>
                <Strong>Beginners:</Strong> start around{" "}
                <Strong>2-4 repetitions in reserve</Strong>, learn exercises,
                then gradually experience genuinely hard sets. A novice who
                thinks every uncomfortable set is &ldquo;rating of perceived
                exertion 10&rdquo; cannot meaningfully autoregulate by
                repetitions in reserve until calibration improves.
              </li>
              <li>
                <Strong>Advanced lifters:</Strong> use failure strategically
                rather than ideologically. A final isolation set at 0
                repetitions in reserve can be useful; five consecutive sets of
                squats to failure usually represent poor fatigue management
                rather than superior hypertrophy programming. This is a
                practical inference from failure research rather than a tested
                universal rule
                <Cite n={[13, 14]} />.
              </li>
            </ArticleUl>
          </ArticleSection>

          <ArticleSection
            id="programs"
            number={4}
            title="Sample programs and maintenance"
          >
            <ArticleP>
              These templates assume a generally healthy trainee. They are
              examples, not claims that specific exercises are uniquely
              superior. The American College of Sports Medicine&apos;s 2026
              synthesis indicates that machines, free weights, bands, and other
              resistance modalities can all produce meaningful muscular
              adaptations
              <Cite n={1} />. Substitute movements you can perform with good
              technique and available equipment.
            </ArticleP>

            <H3>Beginner: three full-body days</H3>
            <ArticleP>
              Train the whole body on three nonconsecutive days, use mostly two
              work sets per exercise, stay around 2-3 repetitions in reserve for
              the first several weeks, and progress repetitions before load.
              That typically gives major muscles roughly 6-10 weekly sets
              without a body-part split. A beginner does <Strong>not</Strong>{" "}
              need a high-volume body-part split. Much of the early response
              comes from simply progressing consistent resistance training, and
              the American College of Sports Medicine&apos;s updated review
              emphasizes regular exposure over complicated programming
              <Cite n={1} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[6rem]">Day</TableHead>
                  <TableHead className="min-w-[12rem]">Exercises</TableHead>
                  <TableHead className="min-w-[10rem]">Prescription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Full Body A
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Squat or leg press; bench press; lat pulldown; Romanian
                    deadlift; lateral raise; curl
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Compounds 2×6-12; isolation 1-2×10-20; ~2-3 repetitions in
                    reserve
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Full Body B
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Split squat; incline press; seated row; leg curl; calf
                    raise; triceps pressdown
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Compounds 2×6-12; isolation 1-2×10-20; ~2-3 repetitions in
                    reserve
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Rotation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Week one A/B/A; week two B/A/B
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Add repetitions, then modest load at the top of the range
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>

            <H3>Intermediate: four-day upper/lower</H3>
            <ArticleP>
              Four days per week using an upper/lower split is a particularly
              efficient way to reach roughly 10-14 quality sets for major muscle
              groups while providing two weekly exposures. Most sets should live
              around <Strong>1-3 repetitions in reserve</Strong>, with 0-1
              repetitions in reserve more common on the final isolation set than
              on a heavy compound. Weekly direct volume in this template lands
              near the current evidence-based neighborhood for hypertrophy,
              while compounds contribute additional fractional work to secondary
              muscles
              <Cite n={[1, 2]} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[6rem]">Day</TableHead>
                  <TableHead className="min-w-[14rem]">
                    Example exercises
                  </TableHead>
                  <TableHead className="min-w-[6rem]">Work sets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Upper A
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Bench press 3; row 3; incline dumbbell press 2; pulldown 2;
                    lateral raise 3; curl 2; triceps 2
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~17
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Lower A
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Squat 3; Romanian deadlift 3; leg press 2; leg curl 2;
                    calves 3
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~13
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Upper B
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Incline press 3; pulldown or pull-up 3; machine press 2;
                    cable row 2; lateral raise 3; curl 2; triceps 2
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~17
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Lower B
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Hack squat or leg press 3; deadlift or hip hinge 2; split
                    squat 2; leg curl 3; calves 3
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~13
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              Progress this program by adding repetitions and load first. Only
              increase sets when a muscle has stalled for several weeks{" "}
              <Strong>and</Strong> technique, sleep, motivation, soreness, and
              session-to-session performance indicate adequate recovery. Because
              the volume-response curve has diminishing returns, reflexively
              adding sets whenever progress slows is not always the correct
              intervention
              <Cite n={2} />.
            </ArticleP>

            <H3>Advanced: selective specialization</H3>
            <ArticleP>
              An advanced lifter benefits less from generic rules and more from
              selective specialization. A five-day upper/lower/push/pull/legs
              arrangement can distribute roughly 10-16 baseline sets for most
              muscles while allowing a priority body part to approach the upper
              teens. Do not prescribe 18-20 sets for every muscle
              simultaneously. Place perhaps 14-20 weekly sets on one or two
              priority muscles while holding already-developed muscles closer to
              about 6-10, or whatever dose demonstrably maintains them
              <Cite n={[2, 6]} />.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[6rem]">Day</TableHead>
                  <TableHead className="min-w-[8rem]">Emphasis</TableHead>
                  <TableHead className="min-w-[14rem]">
                    Example structure
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Monday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Upper, heavier
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Press 3; row 3; secondary press 2; pull 2; delts 2; arms 2+2
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Tuesday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Lower, heavier
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Squat 3; hinge 3; secondary quad 2; hamstring curl 2; calves
                    3
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Wednesday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Rest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Recovery
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Thursday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Push hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Chest 5-7 total sets; delts 4-6; triceps 3-5
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Friday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Pull hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Back 6-8 total sets; rear delts 3; biceps 3-5
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Saturday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Legs hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Quads 5-7; hamstrings/glutes 5-7; calves 3-4
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Sunday
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Rest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Recovery
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>

            <H3>Maintenance</H3>
            <ArticleP>
              Far less work is usually required to keep muscle than to grow it.
              In a notable 32-week randomized experiment after 16 weeks of
              training, young adults preserved acquired hypertrophy even when
              training dose fell to one-third or one-ninth of the prior dose;
              older adults did not preserve hypertrophy as successfully with
              those reductions
              <Cite n={6} />. That is strong evidence for a
              maintenance-versus-growth asymmetry, not proof that
              &ldquo;one-ninth volume&rdquo; works for every person, muscle, or
              age group.
            </ArticleP>
            <ArticleP>
              A sensible maintenance phase could preserve exercise intensity and
              effort while initially reducing weekly sets by roughly 50-70%,
              followed by monitoring of strength, repetitions at standardized
              loads, body measurements, and subjective recovery. That percentage
              is a conservative practical extrapolation rather than an exact
              scientific threshold. Bickel and colleagues demonstrated that even
              larger reductions maintained hypertrophy in young adults in their
              specific protocol, while older participants required more loading
              to preserve size
              <Cite n={6} />.
            </ArticleP>
            <H3>If progress stalls</H3>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[10rem]">
                    Plateau situation
                  </TableHead>
                  <TableHead className="min-w-[8rem]">First response</TableHead>
                  <TableHead className="min-w-[10rem]">Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Still adding repetitions or load
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Do nothing
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Program is working
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    One bad session
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Do nothing / assess sleep, stress, food
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Normal noise
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Several stagnant sessions but sets are above 3-4 repetitions
                    in reserve
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Increase effort or load
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Stimulus may be inadequate
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Stagnant, effort appropriate, recovery excellent
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Add about 1-2 weekly sets for that muscle
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Potential volume opportunity
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Stagnant and performance or soreness worsening
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Reduce volume or failure exposure temporarily
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    More work may deepen fatigue
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Advanced lifter needs simultaneous strength and hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Organize loading into blocks or undulating days
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Periodization helps organization, though complex models are
                    not required for hypertrophy
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <ArticleP>
              The evidence does not justify &ldquo;muscle confusion,&rdquo;
              frequent exercise replacement, or predetermined deloads every
              exact number of weeks as necessities. Periodization can be
              organizationally useful, especially to manage strength specificity
              and fatigue, but the American College of Sports Medicine&apos;s
              comprehensive 2026 review did not find complex periodization
              consistently necessary for general resistance-training outcomes
              <Cite n={1} />.
            </ArticleP>
          </ArticleSection>

          <ArticleSection
            id="supplements"
            number={5}
            title="Supplements, doses, safety, and typical costs"
          >
            <ArticleP>
              The supplement hierarchy is much narrower than fitness marketing
              implies. Resistance training, sufficient energy and protein,
              sleep, and consistent progression dominate the outcome. Of
              commonly sold &ldquo;muscle building&rdquo; supplements,{" "}
              <Strong>
                creatine monohydrate and protein supplementation when dietary
                protein is insufficient have the clearest direct evidence
              </Strong>
              <Cite n={[7, 8, 9]} />. Beema Health does not sell supplements.
              The doses below are typical amounts studied in healthy adults, not
              a recommendation that you should take them.
            </ArticleP>
            <Callout title="Costs and quality">
              Monthly cost estimates are representative United States retail
              snapshots from August 2026, not formal market averages and not
              Beema prices. Retail prices change quickly. In the United States,
              dietary supplements are not individually approved by the United
              States Food and Drug Administration for safety and efficacy before
              they reach the market; manufacturers bear primary responsibility,
              with the United States Food and Drug Administration exercising
              substantial post-market authority
              <Cite n={19} />. That makes reputable manufacturing and
              independent third-party testing more meaningful than flashy
              proprietary blends.
            </Callout>

            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[8rem]">Supplement</TableHead>
                  <TableHead className="min-w-[9rem]">
                    Evidence for muscle gain
                  </TableHead>
                  <TableHead className="min-w-[8rem]">Effective dose</TableHead>
                  <TableHead className="min-w-[7rem]">Timing</TableHead>
                  <TableHead className="min-w-[9rem]">
                    Main safety points
                  </TableHead>
                  <TableHead className="min-w-[7rem]">
                    Representative monthly cost
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Creatine monohydrate
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    High; augments resistance-training adaptations and direct
                    measures of hypertrophy
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    3-5 grams per day; optional 20 grams per day loading split
                    into 4 doses for 5-7 days
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Anytime; daily consistency matters
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Water-weight gain common; healthy-adult safety record is
                    strong
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~$7-10
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Whey protein
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    High if it closes a protein gap; unnecessary if diet already
                    meets needs
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Total dietary protein around ~1.6 grams per kilogram of body
                    weight per day; ~0.3 grams per kilogram of body weight
                    high-quality protein per feeding
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Flexible; after training is convenient, not a tiny
                    &ldquo;anabolic window&rdquo;
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Milk allergy; lactose or gastrointestinal issues depending
                    on product; renal issues need individualized advice
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~$40 per daily 24 grams scoop
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Beta-alanine
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Low for hypertrophy; moderate for certain high-intensity
                    performance tasks
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    4-6 grams per day, split
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Daily for at least 2-4 weeks; not an acute pre-workout
                    effect
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Paresthesia/tingling, especially large single doses
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~$5-7
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Beta-hydroxy-beta-methylbutyrate
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Mixed/low-to-moderate; more plausible in high-damage,
                    untrained, older, or catabolic contexts than in established
                    trained lifters
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~3 grams per day
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often divided; some guidance starts at least 2 weeks before
                    demanding periods
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Short-term 3 grams per day generally tolerated; long-term
                    evidence less certain
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~$15-20
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Caffeine
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Good acute performance evidence; not proven as a direct
                    hypertrophy supplement
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Evidence commonly 2-6 milligrams per kilogram of body
                    weight; starting lower is prudent
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    about 15-60 minutes before training
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Insomnia, anxiety, tachycardia, arrhythmia; 400 milligrams
                    per day is the United States Food and Drug
                    Administration&apos;s generally safe level for healthy
                    adults
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~$1-3 with generic tablets
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Essential amino acids
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Conditional; useful if complete protein intake is inadequate
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Often ~10 grams complete essential amino acid serving
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Around training or between low-protein meals
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Generally redundant when adequate complete protein is
                    consumed
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~$16 at one serving per day
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Branched-chain amino acids alone
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Weak/inconsistent beyond adequate complete protein
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    No compelling hypertrophy dose when protein is already
                    sufficient
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Not important
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Generally tolerated at ordinary supplemental doses
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually not worth purchasing
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Citrulline / betaine / glutamine
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Insufficient direct hypertrophy evidence for routine
                    recommendation
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Varies
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Varies
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Product-specific
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Not a priority
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <Callout title="Medical conditions are unspecified" tone="caution">
              Kidney disease can change protein and creatine decisions. Cardiac
              rhythm disorders, hypertension, anxiety, sleep disorders, and
              interacting medications can materially alter caffeine risk.
              Allergies and gastrointestinal disorders can affect whey
              suitability. The National Institutes of Health healthy-adult
              safety evidence should not be extrapolated indiscriminately to
              every clinical population
              <Cite n={9} />. Talk with a licensed clinician before starting any
              supplement.
            </Callout>

            <H3>Creatine monohydrate</H3>
            <ArticleP>
              Creatine increases intramuscular creatine/phosphocreatine
              availability, supporting rapid adenosine triphosphate resynthesis
              during repeated high-intensity efforts and thereby increasing
              training capacity. The National Institutes of Health&apos;s Office
              of Dietary Supplements describes creatine as one of the most
              thoroughly studied exercise supplements and notes benefits for
              repeated high-intensity work, strength, and long-term training
              adaptations
              <Cite n={9} />. A systematic review and meta-analysis of
              resistance-training studies using direct imaging measures found a
              small additional increase in skeletal muscle hypertrophy with
              creatine compared with resistance training plus placebo
              <Cite n={8} />.
            </ArticleP>
            <ArticleP>
              The standard protocol is either{" "}
              <Strong>3-5 grams creatine monohydrate every day</Strong>, or an
              optional loading phase of about{" "}
              <Strong>
                20 grams per day split into four doses for 5-7 days
              </Strong>
              , followed by 3-5 grams per day. Loading reaches saturation faster
              but is not required; several weeks of ordinary daily dosing
              reaches a similar destination
              <Cite n={9} />. The National Institutes of Health reports that
              creatine is considered safe in healthy adults, including evidence
              extending over several years, while noting that initial bodyweight
              may increase from water retention
              <Cite n={9} />. There is little rationale to pay a premium for
              exotic creatine variants if ordinary monohydrate is tolerated.
            </ArticleP>
            <ArticleP>
              Snapshot pricing from the source synthesis: a 60-serving product
              providing 5 grams per serving listed around $18.97 makes 5 grams
              per day roughly <Strong>$9.49 per month</Strong>; a 100-serving
              listing around $24.97 gives approximately{" "}
              <Strong>$7.49 per month</Strong> at the same dose.
            </ArticleP>

            <H3>Whey protein</H3>
            <ArticleP>
              Protein&apos;s role is fundamentally different from
              creatine&apos;s: protein powder is a convenient food-derived way
              of satisfying a nutrient requirement. Whey is a complete,
              leucine-rich milk protein, but chicken, fish, eggs, dairy, soy,
              and properly composed plant diets can all contribute toward the
              same total-protein goal. The National Institutes of Health states
              that protein is required for muscle growth, maintenance, and
              repair and cites athlete recommendations around{" "}
              <Strong>1.2-2.0 grams per kilogram of body weight per day</Strong>
              , with approximately{" "}
              <Strong>
                0.3 grams per kilogram of body weight of high-quality protein
                per feeding
              </Strong>{" "}
              around training and every few hours thereafter as one workable
              pattern
              <Cite n={9} />.
            </ArticleP>
            <ArticleP>
              The most influential resistance-training meta-regression found
              that additional gains in fat-free mass plateaued at approximately{" "}
              <Strong>1.62 grams per kilogram of body weight per day</Strong> of
              total protein on average
              <Cite n={7} />. Thus, for an unspecified healthy adult attempting
              hypertrophy,{" "}
              <Strong>
                ~1.6 grams per kilogram of body weight per day is an excellent
                evidence-based target
              </Strong>
              , with something like 1.6-2.0 grams per kilogram of body weight
              per day offering an easy practical buffer. Higher intakes can be
              situationally useful during calorie restriction, but the evidence
              does not support believing that 250-300 grams per day is
              inherently more anabolic for a normal-size lifter who is already
              well above the effective range
              <Cite n={[7, 9]} />.
            </ArticleP>
            <ArticleP>
              Timing is less important than total intake. The National
              Institutes of Health notes that high-quality protein in the early
              post-exercise period is useful, but also cites meta-analysis
              showing that a narrow one-hour pre/post window is not required;
              the exercise-related anabolic period is substantially longer
              <Cite n={9} />. A 5-pound whey tub listed at $96.28 for
              approximately 73 servings works out to about{" "}
              <Strong>$39.57 per month at one serving per day</Strong>. If the
              shake replaces some otherwise-purchased food protein, the net
              monthly cost is smaller than $40.
            </ArticleP>

            <H3>Beta-alanine</H3>
            <ArticleP>
              Beta-alanine raises skeletal-muscle carnosine, improving
              intracellular buffering during high-intensity glycolytic work. The
              National Institutes of Health summarizes evidence supporting{" "}
              <Strong>4-6 grams per day for at least 2-4 weeks</Strong>,
              particularly for hard efforts lasting roughly 60 seconds to
              several minutes. It explicitly notes that more research is needed
              to determine whether this translates into additional strength or
              muscle mass from resistance training
              <Cite n={9} />.
            </ArticleP>
            <ArticleP>
              That makes beta-alanine a{" "}
              <Strong>
                training-performance supplement, not a hypertrophy supplement
              </Strong>
              . It becomes more rational if programming includes long,
              high-repetition sets, repeated hard circuits, or other work where
              acid-base buffering constrains output. Its characteristic tingling
              (paresthesia) is benign but can be unpleasant; dividing doses into
              portions of 2 grams or less reduces it
              <Cite n={9} />. A 500-gram powder listed around $19.95 costs
              approximately <Strong>$4.79 per month at 4 grams per day</Strong>{" "}
              or <Strong>$7.18 per month at 6 grams per day</Strong>.
            </ArticleP>

            <H3>Beta-hydroxy-beta-methylbutyrate</H3>
            <ArticleP>
              Beta-hydroxy-beta-methylbutyrate is a leucine metabolite
              hypothesized to stimulate protein synthesis and reduce
              muscle-protein breakdown. The National Institutes of Health notes
              that studies have typically used around{" "}
              <Strong>3 grams per day</Strong>, but the exercise literature is
              heterogeneous and conflicting. It also notes no expert consensus
              for long-term use and that beta-hydroxy-beta-methylbutyrate is not
              included among evidence-based ergogenic aids recommended by
              several major sports-nutrition organizations
              <Cite n={9} />.
            </ArticleP>
            <ArticleP>
              That does not mean beta-hydroxy-beta-methylbutyrate does nothing.
              It may be more useful in untrained individuals, older adults,
              people exposed to unusually muscle-damaging exercise, or catabolic
              circumstances. But for a healthy, protein-sufficient,
              resistance-trained adult choosing where to spend money, creatine
              and protein adequacy rank substantially higher
              <Cite n={9} />. Snapshot pricing: a 240-capsule product containing
              500 milligrams per capsule listed around $19.50. Six capsules per
              day provides 3 grams, yielding approximately{" "}
              <Strong>$14.63 per month</Strong>.
            </ArticleP>

            <H3>Caffeine</H3>
            <ArticleP>
              Caffeine antagonizes adenosine receptors, increasing arousal and
              reducing perceived fatigue and exertion. The National Institutes
              of Health summarizes performance benefits at approximately{" "}
              <Strong>2-6 milligrams per kilogram of body weight</Strong>{" "}
              consumed before exercise and recommends administration roughly{" "}
              <Strong>15-60 minutes beforehand</Strong>
              <Cite n={9} />. For resistance training, starting lower, often
              around 1-3 milligrams per kilogram of body weight, is a cautious
              practical recommendation rather than a separate proven hypertrophy
              optimum. The goal is useful performance enhancement without
              undermining sleep or creating cardiovascular or anxiety symptoms.
            </ArticleP>
            <ArticleP>
              Caffeine is particularly easy to misuse in a muscle-building
              context. A slightly better workout in the evening is probably not
              a net win if 300 milligrams of caffeine meaningfully damages that
              night&apos;s sleep. The National Institutes of Health reports a
              caffeine half-life around 4-5 hours and lists insomnia,
              restlessness, tachycardia, and arrhythmias among adverse effects.
              The United States Food and Drug Administration considers
              approximately <Strong>400 milligrams per day</Strong> generally
              not associated with dangerous effects for healthy adults, though
              sensitivity varies substantially
              <Cite n={[9, 18]} />. Generic caffeine is inexpensive: a current
              120-capsule, 200 milligrams product listed at $9.99 costs
              approximately{" "}
              <Strong>
                $1.08 per month if used for about three weekly sessions
              </Strong>{" "}
              or <Strong>$2.50 per month if one capsule is taken daily</Strong>.
            </ArticleP>

            <H3>Essential amino acids and branched-chain amino acids</H3>
            <ArticleP>
              Essential amino acids are required for synthesis of new muscle
              protein, but that is not equivalent to saying an essential amino
              acid supplement adds value on top of adequate complete protein.
              The National Institutes of Health concludes that evidence for
              supplemental branched-chain amino acids is inconsistent beyond the
              effect achievable with sufficient high-quality protein and
              specifically notes that whey already contains abundant
              branched-chain amino acids
              <Cite n={9} />. Essential amino acids can make sense when someone
              cannot practically consume a complete-protein meal or shake, but
              they are usually economically inferior to simply fixing total
              dietary protein. A 50-serving, 10 grams essential amino acid
              powder listed at $25.97 costs approximately{" "}
              <Strong>$15.58 per month at one serving daily</Strong>. For
              someone already consuming ~1.6 grams per kilogram of body weight
              per day of good-quality protein, that money is better saved.
            </ArticleP>
          </ArticleSection>

          <ArticleSection
            id="checklist"
            number={6}
            title="Quick-reference checklist"
          >
            <ArticleP>
              This is the condensed one-page version of the guide.
            </ArticleP>
            <ArticleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[10rem]">Decision</TableHead>
                  <TableHead className="min-w-[14rem]">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Main hypertrophy repetition zone
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    6-15 repetitions for most work, while recognizing broader
                    ranges work
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Main loading zone
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~60-80% of one-repetition maximum for efficiency
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Compound effort
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    1-3 repetitions in reserve
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Isolation/machine effort
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    0-2 repetitions in reserve, selective failure acceptable
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Weekly growth volume
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Begin near 8-12 hard sets/muscle, then individualize
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Beginner / intermediate / advanced volume
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~6-10; ~10-16; ~10-16 baseline with selectively higher
                    priority muscles
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Maintenance
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Substantially reduce volume before reducing meaningful
                    load/effort
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Frequency
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Usually 2+ exposures/muscle/week
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Rest
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    2-3+ minutes compounds; ~1-2+ minutes isolation
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Daily protein / creatine
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    ~1.6 grams per kilogram of body weight per day total
                    protein; 3-5 grams per day creatine if used
                  </TableCell>
                </TableRow>
              </TableBody>
            </ArticleTable>
            <H3>Practical checklist</H3>
            <ArticleUl>
              <li>
                Train every major muscle consistently, normally at least twice
                weekly
                <Cite n={[1, 10]} />.
              </li>
              <li>
                Start around 8-12 challenging sets per muscle per week rather
                than immediately maximizing volume
                <Cite n={[1, 2]} />.
              </li>
              <li>
                Keep most working sets at 1-3 repetitions in reserve; get closer
                to failure on safer isolation and machine work
                <Cite n={[13, 14]} />.
              </li>
              <li>
                Do not interpret muscular failure as mandatory for muscle growth
                <Cite n={[1, 15, 17]} />.
              </li>
              <li>
                Use mostly moderate loads because they are efficient, not
                because other repetition ranges cannot grow muscle
                <Cite n={4} />.
              </li>
              <li>
                Rest sufficiently to preserve subsequent-set performance;
                usually more than 60 seconds and commonly 2-3 minutes for
                demanding exercises
                <Cite n={11} />.
              </li>
              <li>
                Track exercise, load, repetitions, and approximate repetitions
                in reserve so progressive overload is measurable. Add
                repetitions and load before assuming you need more volume.
              </li>
              <li>
                For maintenance, reduce weekly sets aggressively before
                eliminating meaningful loading; maintenance requirements may
                rise with age
                <Cite n={6} />.
              </li>
              <li>
                Reach approximately 1.6 grams per kilogram of body weight per
                day total protein, then consider whey only for convenience
                <Cite n={[7, 9]} />.
              </li>
              <li>
                Take 3-5 grams per day creatine monohydrate if you want the
                highest-evidence muscle-oriented supplement and a clinician
                agrees it is appropriate
                <Cite n={[8, 9]} />.
              </li>
              <li>
                Treat caffeine and beta-alanine as performance tools rather than
                direct muscle-growth compounds
                <Cite n={9} />.
              </li>
              <li>
                Do not spend heavily on beta-hydroxy-beta-methylbutyrate,
                branched-chain amino acids, or elaborate stacks before training,
                protein, and creatine are already optimized
                <Cite n={9} />.
              </li>
            </ArticleUl>
            <H3>Programming decision flow</H3>
            <ArticleUl>
              <li>
                New to structured resistance training: use the 3-day full-body
                program, start around 6-10 sets per muscle per week, mostly 2-3
                repetitions in reserve, and progress repetitions then load.
              </li>
              <li>
                Currently progressing on moderate volume: keep current volume
                and continue adding repetitions or load.
              </li>
              <li>
                Not progressing, and sets are often above 3-4 repetitions in
                reserve: increase effort before adding volume.
              </li>
              <li>
                Not progressing, sets are genuinely challenging, and recovery is
                good: add roughly 1-2 weekly sets to the stalled muscle, then
                reassess after several weeks.
              </li>
              <li>
                Not progressing and recovery or performance is poor: fewer
                failure sets and/or fewer total sets; review sleep, nutrition,
                and exercise selection.
              </li>
              <li>
                Maintenance phase: keep meaningful load and effort, reduce
                weekly volume substantially, and monitor standardized
                strength/repetitions and muscle measurements.
              </li>
              <li>
                Supplement foundation: protein adequacy first, then creatine 3-5
                grams per day if appropriate; other supplements only for
                specific needs.
              </li>
            </ArticleUl>
            <ArticleP>
              <Strong>Bottom-line actionable prescription</Strong> for an
              otherwise healthy adult whose unspecified characteristics do not
              require modification: train each muscle about twice weekly,
              accumulate roughly <Strong>8-12 challenging weekly sets</Strong>,
              perform most work in the{" "}
              <Strong>
                6-15-repetition range at approximately 1-3 repetitions in
                reserve
              </Strong>
              , rest <Strong>2-3 minutes on demanding compounds</Strong>, and
              progress repetitions and then load. Increase weekly sets gradually
              only if progress stalls while recovery remains good. Use true
              failure selectively, primarily on stable machine/isolation
              movements. For a pure maintenance phase, retain meaningful
              intensity and effort but sharply reduce total volume. Consume
              roughly{" "}
              <Strong>
                1.6 grams per kilogram of body weight per day total protein
              </Strong>
              , use <Strong>3-5 grams per day creatine monohydrate</Strong> if
              supplementation is desired and appropriate, and regard everything
              else as secondary or situational
              <Cite n={[1, 2, 6, 7, 9, 11, 13]} />.
            </ArticleP>
            <Callout title="What remains uncertain">
              Confidence is high for the broad conclusions (progressive
              resistance training, sufficient challenging volume, near-failure
              effort without mandatory failure, adequate protein, and creatine)
              because they are supported by multiple meta-analyses and the 2026
              American College of Sports Medicine synthesis. Uncertainty remains
              around the exact individualized &ldquo;optimal&rdquo; number of
              weekly sets, the precise repetitions-in-reserve hypertrophy
              dose-response curve, maintenance requirements across age groups,
              advanced lifters who are underrepresented in parts of the
              literature, and supplement retail prices, which can change
              rapidly. Unspecified age, sex, body weight, training experience,
              medical status, diet, and recovery capacity also prevent a truly
              individualized optimum
              <Cite n={[1, 2, 6, 13]} />.
            </Callout>
          </ArticleSection>

          <ArticleSection
            id="faq"
            number={7}
            title="Frequently Asked Questions"
          >
            <Accordion type="single" collapsible className="w-full">
              {RESISTANCE_TRAINING_FAQ.map((item, i) => (
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

          <ArticleSection id="references" number={8} title="References">
            <Accordion type="single" collapsible defaultValue="refs">
              <AccordionItem
                value="refs"
                className="rounded-2xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Full reference list ({RESISTANCE_TRAINING_REFERENCES.length}{" "}
                  sources)
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {RESISTANCE_TRAINING_REFERENCES.map((ref, i) => (
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
                to={REST_INTERVALS_PATH}
                className="text-foreground underline-offset-2 hover:underline"
              >
                {REST_INTERVALS_TITLE}
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

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
import { BmiCalculator } from "@/components/site/BmiCalculator";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
} from "@/lib/medication-pricing";
import {
  INITIAL_RESEARCH_DATE_MODIFIED,
  INITIAL_RESEARCH_DESCRIPTION,
  INITIAL_RESEARCH_FAQ,
  INITIAL_RESEARCH_PATH,
  INITIAL_RESEARCH_REFERENCES,
  INITIAL_RESEARCH_TITLE,
  INITIAL_RESEARCH_TOC,
} from "@/lib/learn/initial-research";
import { cn } from "@/lib/utils";

const PAGE_TITLE = `${INITIAL_RESEARCH_TITLE} | Beema Health`;

export const Route = createFileRoute("/learn/initial-research")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: INITIAL_RESEARCH_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      {
        property: "og:description",
        content: INITIAL_RESEARCH_DESCRIPTION,
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(INITIAL_RESEARCH_PATH) }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
            {
              name: "Traditional vs. GLP-1 Weight Loss",
              path: INITIAL_RESEARCH_PATH,
            },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: INITIAL_RESEARCH_TITLE,
            description: INITIAL_RESEARCH_DESCRIPTION,
            path: INITIAL_RESEARCH_PATH,
            reviewedByClinicalLead: true,
            dateModified: INITIAL_RESEARCH_DATE_MODIFIED,
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(INITIAL_RESEARCH_FAQ)),
      },
    ],
  }),
  component: InitialResearchPage,
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

function InitialResearchPage() {
  const cta = resolveCta(CTA_IDS.learn_initial_research);

  useEffect(() => {
    trackPageViewed("learn_initial_research");
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
                <BreadcrumbPage>Traditional vs. GLP-1</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <SectionHeading
            as="h1"
            eyebrow="Evidence-based guide"
            title={INITIAL_RESEARCH_TITLE}
            description="An educational comparison of lifestyle approaches and GLP-1 receptor agonist therapy, grounded in peer-reviewed trials and clinical guidelines."
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {INITIAL_RESEARCH_DATE_MODIFIED}
          </p>
        </div>
      </section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <Callout title="Educational disclaimer" tone="caution">
            Educational content prepared for Beema Health. Beema Health does not
            practice medicine, prescribe, or dispense medications. All clinical
            decisions are made by independent licensed providers, and any
            medications are fulfilled by licensed pharmacy partners. This guide
            is for general educational purposes only and is not medical advice.
            Consult a licensed healthcare professional before starting any
            weight-management program or medication.
          </Callout>

          <p className="text-sm text-muted-foreground">
            Want a quick reference point first?{" "}
            <a
              href="#bmi"
              className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
            >
              Check your BMI
            </a>
            .
          </p>

          <nav
            aria-label="Table of contents"
            className="rounded-2xl border border-border bg-background px-5 py-4"
          >
            <p className="text-sm font-semibold text-foreground">
              Table of contents
            </p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="#bmi"
                  className="transition-colors hover:text-foreground"
                >
                  BMI Calculator
                </a>
              </li>
              {INITIAL_RESEARCH_TOC.map((item, index) => (
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
        </div>

        <div
          id="bmi"
          className="mx-auto mt-10 max-w-5xl scroll-mt-28 space-y-6"
        >
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              BMI Calculator
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              See where your BMI falls, then decide if it&apos;s worth a
              conversation with a licensed provider. For general information
              only; the below calculator is not a diagnosis and is not part of
              medical intake.
            </p>
          </div>
          <BmiCalculator ctaId={CTA_IDS.learn_initial_research_bmi} />
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-10">
          {/* 1. Traditional */}
          <ArticleSection
            id="traditional"
            number={1}
            title="The Traditional Weight Loss Path"
          >
            <ArticleP>
              The foundation of every evidence-based weight-management strategy
              (including drug-assisted ones) is a sustained energy deficit
              combined with behavior change. Traditional methods remain
              first-line, low-risk, and widely recommended by public-health
              authorities.
            </ArticleP>

            <Accordion type="multiple" className="w-full">
              <AccordionItem
                value="caloric"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Caloric deficit fundamentals
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleP>
                    Weight loss occurs when energy expenditure exceeds energy
                    intake over time. The CDC states that people who lose weight
                    gradually (about <Strong>1 to 2 pounds per week</Strong>)
                    are more likely to keep it off than those who lose weight
                    quickly, and that achieving this pace generally requires
                    reducing caloric intake by roughly{" "}
                    <Strong>500-1,000 calories per day</Strong>
                    <Cite n={1} />. The 2013 AHA/ACC/TOS obesity guideline
                    operationalizes the deficit three ways: prescribing{" "}
                    <Strong>
                      1,200-1,500 kcal/day for women and 1,500-1,800 kcal/day
                      for men
                    </Strong>
                    ; prescribing a{" "}
                    <Strong>500-750 kcal/day energy deficit</Strong>; or
                    prescribing an evidence-based diet that restricts certain
                    food types to create a deficit
                    <Cite n={2} />.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="diet"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Diet approaches
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleP>
                    No single macronutrient composition has proven clearly
                    superior when calorie intake is matched. The{" "}
                    <Strong>DIETFITS randomized trial</Strong> (JAMA, 2018)
                    compared a healthy low-fat versus a healthy low-carbohydrate
                    diet in 609 adults over 12 months and found no statistically
                    significant difference in weight change (−5.3 kg low-fat vs.
                    −6.0 kg low-carb), with wide individual variation in both
                    arms
                    <Cite n={3} />. The 2013 AHA/ACC/TOS guideline reached a
                    consistent conclusion: a variety of dietary approaches
                    produce weight loss &ldquo;if reduction in dietary energy
                    intake is achieved&rdquo;
                    <Cite n={2} />. The practical implication is that{" "}
                    <Strong>
                      adherence and sustainability matter more than the specific
                      diet label
                    </Strong>
                    . Patients should choose an eating pattern they can
                    maintain.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="timelines"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Realistic timelines and rates of weight loss
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleP>
                    The AHA/ACC/TOS guideline notes that diet-driven weight loss
                    is typically maximal at about <Strong>6 months</Strong> (a
                    range of roughly 4-12 kg from dietary intervention alone),
                    followed by slow regain thereafter
                    <Cite n={2} />. The <Strong>Look AHEAD trial</Strong>, the
                    largest and longest randomized lifestyle-intervention study
                    in adults with type 2 diabetes (n = 5,145), found that the
                    intensive lifestyle-intervention group achieved its maximum
                    weight loss of about <Strong>8.5% at year 1</Strong> but
                    maintained <Strong>4.7% at year 8</Strong>, versus 2.1% in
                    the control group; at year 8, 50.3% of the intervention
                    group had maintained ≥5% loss
                    <Cite n={4} />. This illustrates the central challenge of
                    the traditional path: initial loss is achievable for most
                    people, but long-term maintenance is difficult and regain is
                    common.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="resistance"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Resistance training&apos;s role in preserving lean mass
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleP>
                    Any energy deficit causes loss of both fat and lean (muscle)
                    tissue. Resistance training is the best-established
                    countermeasure. A{" "}
                    <Strong>systematic review and meta-analysis</Strong> of
                    randomized trials in obese older adults found that
                    resistance training reduced caloric-restriction-induced
                    lean-mass loss by <Strong>93.5%</Strong> while still
                    permitting substantial fat loss
                    <Cite n={5} />. Adequate dietary protein (commonly cited at
                    1.2-1.6 g/kg/day during active weight loss) further supports
                    muscle preservation
                    <Cite n={16} />.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="behavior"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Behavioral consistency factors
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleP>
                    The AHA/ACC/TOS guideline recommends{" "}
                    <Strong>
                      comprehensive lifestyle programs lasting at least 6 months
                    </Strong>
                    , delivered in high-intensity format (≥14 sessions in 6
                    months) by a trained interventionist, as the most effective
                    behavioral structure for durable results
                    <Cite n={2} />. Consistency, self-monitoring,
                    accountability, sleep, and stress management are all cited
                    by the CDC as factors that meaningfully affect long-term
                    success
                    <Cite n={1} />.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ArticleSection>

          {/* 2. GLP-1 */}
          <ArticleSection
            id="glp1"
            number={2}
            title="The GLP-1 Path: How It Works"
          >
            <Accordion type="multiple" defaultValue={["mechanism", "trials"]}>
              <AccordionItem
                value="mechanism"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Mechanism of action
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleP>
                    GLP-1 (glucagon-like peptide-1) receptor agonists mimic an
                    endogenous intestinal incretin hormone secreted in response
                    to food intake. They act through both central and peripheral
                    pathways
                    <Cite n={6} />:
                  </ArticleP>
                  <ArticleUl>
                    <li>
                      <Strong>Central (brain):</Strong> They activate GLP-1
                      receptors in appetite-regulating regions such as the
                      hypothalamus, reducing hunger and increasing satiety,
                      which lowers overall caloric intake.
                    </li>
                    <li>
                      <Strong>Peripheral (gut/pancreas):</Strong> They slow
                      gastric emptying (prolonging fullness after meals),
                      enhance glucose-dependent insulin secretion, and inhibit
                      glucagon release.
                    </li>
                  </ArticleUl>
                  <ArticleP>
                    <Strong>Tirzepatide</Strong> is a dual agonist that
                    activates both the GLP-1 receptor and the GIP
                    (glucose-dependent insulinotropic polypeptide) receptor, a
                    mechanism that may contribute to its larger average
                    weight-loss effect
                    <Cite n={9} />. The net physiological change is reduced
                    energy intake driven primarily by decreased appetite and
                    earlier satiety, not by &ldquo;burning&rdquo; fat directly
                    <Cite n={6} />.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="trials"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Realistic timelines and average weight loss from major trials
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleUl>
                    <li>
                      <Strong>
                        Semaglutide 2.4 mg, STEP 1 (Wilding et al., NEJM 2021):
                      </Strong>{" "}
                      Mean weight loss of <Strong>14.9%</Strong> at 68 weeks vs.
                      2.4% with placebo (both with lifestyle intervention);
                      86.4% of the semaglutide group achieved ≥5% loss vs. 31.5%
                      placebo
                      <Cite n={7} />.
                    </li>
                    <li>
                      <Strong>Semaglutide, STEP 5 (2-year):</Strong> −
                      <Strong>15.2%</Strong> vs. −2.6% placebo at week 104,
                      showing durability of effect while treatment continues
                      <Cite n={8} />.
                    </li>
                    <li>
                      <Strong>
                        Tirzepatide, SURMOUNT-1 (Jastreboff et al., NEJM 2022):
                      </Strong>{" "}
                      Mean weight loss of{" "}
                      <Strong>
                        16.0% (5 mg), 21.4% (10 mg), and 22.5% (15 mg)
                      </Strong>{" "}
                      vs. 2.4% placebo at 72 weeks; 89-96% achieved ≥5% loss
                      <Cite n={9} />.
                    </li>
                    <li>
                      <Strong>
                        Head-to-head, SURMOUNT-5 (Aronne et al., NEJM 2025):
                      </Strong>{" "}
                      In 751 adults, tirzepatide produced{" "}
                      <Strong>−20.2%</Strong> vs. semaglutide{" "}
                      <Strong>−13.7%</Strong> at 72 weeks (P&lt;0.001). This is
                      the only randomized head-to-head trial; note it was
                      open-label and industry-funded
                      <Cite n={10} />.
                    </li>
                  </ArticleUl>
                  <ArticleP>
                    Across trials, weight loss typically begins within the first
                    weeks, accelerates during dose titration, and reaches a
                    nadir (plateau) around <Strong>week 60-72</Strong>
                    <Cite n={[7, 9]} />.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ArticleSection>

          {/* 3. Comparison */}
          <ArticleSection
            id="comparison"
            number={3}
            title="Side-by-Side Comparison"
          >
            <ArticleP>
              The table below presents figures{" "}
              <Strong>as reported in each trial or guideline</Strong>. With the
              exception of SURMOUNT-5, these are not head-to-head comparisons;
              the trials enrolled different populations under different
              protocols. The data are presented to inform, not to rank.
            </ArticleP>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[7rem]">Dimension</TableHead>
                    <TableHead className="min-w-[10rem]">
                      Traditional (Lifestyle)
                    </TableHead>
                    <TableHead className="min-w-[10rem]">
                      GLP-1-Assisted
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="align-top font-medium text-foreground">
                      Typical magnitude
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      ~8.5% at year 1; ~4.7% maintained at year 8 (Look AHEAD)
                      <Cite n={4} />
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      14.9% (semaglutide, STEP 1) to 22.5% (tirzepatide 15 mg,
                      SURMOUNT-1)
                      <Cite n={[7, 9]} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="align-top font-medium text-foreground">
                      Timeline to peak
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Maximal ~6 months, then slow regain
                      <Cite n={2} />
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Nadir ~60-72 weeks
                      <Cite n={[7, 9]} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="align-top font-medium text-foreground">
                      Effort profile
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      High, sustained daily behavioral effort (diet + activity +
                      self-monitoring)
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Weekly injection plus recommended lifestyle changes; GI
                      side effects common during titration
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="align-top font-medium text-foreground">
                      Sustainability
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Regain common; about half maintain ≥5% at 8 years
                      <Cite n={4} />
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Weight loss largely dependent on continued use; regain
                      follows discontinuation
                      <Cite n={[11, 12, 17]} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="align-top font-medium text-foreground">
                      Cost
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Lower direct cost (gym, dietitian, food)
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Higher medication cost (see{" "}
                      <a
                        href="#cost"
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        Section 7
                      </a>
                      )
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="align-top font-medium text-foreground">
                      Risk
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      Very low risk
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      GI side effects; boxed warning for thyroid C-cell tumors;
                      requires provider oversight
                      <Cite n={[16, 26]} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Callout title="Compliance note">
              This guide does <Strong>not</Strong> claim that GLP-1 medications
              are universally &ldquo;better&rdquo; than diet and exercise, nor
              that lifestyle change is obsolete. GLP-1 trials layer medication{" "}
              <Strong>on top of</Strong> lifestyle intervention; the two are
              complementary, not mutually exclusive. Individual results vary
              substantially, and the appropriate approach for any person is a
              clinical decision made with a licensed provider.
            </Callout>
          </ArticleSection>

          {/* 4. Lean mass */}
          <ArticleSection
            id="leanmass"
            number={4}
            title="Muscle Preservation and Lean Mass"
          >
            <ArticleP>
              An important, evidence-grounded point:{" "}
              <Strong>some lean-mass loss accompanies all weight loss</Strong>,
              whether achieved through diet, medication, or surgery. This is a
              feature of energy deficit, not a phenomenon unique to GLP-1 drugs.
            </ArticleP>
            <ArticleUl>
              <li>
                <Strong>
                  STEP 1 body-composition substudy (semaglutide, DXA):
                </Strong>{" "}
                Total lean body mass decreased <Strong>9.7%</Strong> from
                baseline, but because fat mass fell more (total fat mass −19.3%,
                visceral fat −27.4%), the <em>proportion</em> of lean mass
                relative to total body mass actually{" "}
                <Strong>increased by 3.0 percentage points</Strong>
                <Cite n={13} />.
              </li>
              <li>
                <Strong>SURMOUNT-1 substudy (tirzepatide, DXA):</Strong> Of the
                weight lost, approximately{" "}
                <Strong>75% was fat mass and 25% was lean mass</Strong>. The
                same fat-to-lean ratio was observed in the placebo group
                <Cite n={14} />.
              </li>
              <li>
                <Strong>Network meta-analysis of GLP-1 therapies:</Strong>{" "}
                Lean-mass loss comprised approximately{" "}
                <Strong>25% of total weight loss</Strong>, which the authors
                characterize as within the normal range for any weight-loss
                method
                <Cite n={15} />.
              </li>
              <li>
                <Strong>Heterogeneity across the literature:</Strong> Some
                reviews report a wider range: lean-mass reductions of roughly{" "}
                <Strong>15% to 40-60%</Strong> of total weight lost, depending
                on the rate of loss, degree of caloric restriction, and whether
                patients performed resistance exercise
                <Cite n={16} />.
              </li>
            </ArticleUl>

            <H3>Role of resistance training and protein</H3>
            <ArticleP>
              The mitigation evidence from traditional weight-loss research
              applies directly: a meta-analysis in obese older adults found
              resistance training prevented <Strong>93.5%</Strong> of
              caloric-restriction-induced lean-mass loss
              <Cite n={5} />, and protein intake of about 1.2-1.6 g/kg/day is
              commonly recommended during active loss
              <Cite n={16} />. Pairing GLP-1 therapy with resistance training
              and adequate protein is a reasonable, evidence-informed strategy
              to favor fat loss over muscle loss.
            </ArticleP>
            <Callout title="Evidence caveat">
              Some secondary or commercial sources claim resistance training and
              protein &ldquo;cut lean-mass loss to near zero.&rdquo; That
              absolute framing should not be treated as a guarantee. The
              strongest peer-reviewed figure is a{" "}
              <Strong>93.5% reduction</Strong> in one older-adult meta-analysis
              <Cite n={5} />, which may not generalize to all GLP-1 users.
            </Callout>
          </ArticleSection>

          {/* 5. Regain */}
          <ArticleSection
            id="regain"
            number={5}
            title="What Happens After Stopping: Weight Regain"
          >
            <Callout>
              Every numeric regain estimate below is sourced directly from a
              peer-reviewed study or clinical-trial extension. No regain
              statistic appears here without a citation.
            </Callout>
            <ArticleUl>
              <li>
                <Strong>
                  STEP 1 trial extension (Wilding et al., Diabetes, Obesity and
                  Metabolism, 2022):
                </Strong>{" "}
                In an off-treatment extension of 327 participants, one year
                after withdrawing semaglutide, participants{" "}
                <Strong>regained 11.6 percentage points</Strong> of the 17.3%
                they had lost, approximately{" "}
                <Strong>two-thirds of their prior weight loss</Strong>,
                resulting in a net loss of <Strong>5.6%</Strong> from baseline
                at week 120. Cardiometabolic improvements likewise reverted
                toward baseline
                <Cite n={11} />.
              </li>
              <li>
                <Strong>STEP 4 (Rubino et al., JAMA, 2021):</Strong> After a
                20-week semaglutide run-in (mean 10.6% loss), participants
                randomized to <Strong>switch to placebo gained 6.9%</Strong>{" "}
                from weeks 20-68, while those who continued semaglutide{" "}
                <Strong>lost an additional 7.9%</Strong>, an estimated treatment
                difference of <Strong>14.8 percentage points</Strong>
                <Cite n={12} />.
              </li>
              <li>
                <Strong>SURMOUNT-4 (Aronne et al., JAMA, 2024):</Strong> After a
                36-week tirzepatide lead-in, participants who{" "}
                <Strong>continued</Strong> treatment achieved a further mean
                change of −19.4% (weeks 36-88) versus substantial regain in
                those switched to placebo; continued treatment maintained and
                augmented weight loss
                <Cite n={17} />.
              </li>
              <li>
                <Strong>
                  SURMOUNT-4 post hoc analysis (Horn et al., JAMA Internal
                  Medicine, 2026):
                </Strong>{" "}
                Among participants who had lost ≥10% and then stopped
                tirzepatide,{" "}
                <Strong>
                  most regained ≥25% of the weight they had lost within one year
                </Strong>
                , accompanied by reversal of cardiometabolic gains
                <Cite n={18} />.
              </li>
            </ArticleUl>
            <ArticleP>
              <Strong>Interpretation:</Strong> These data consistently support
              the clinical framing of obesity as a{" "}
              <Strong>chronic, relapsing condition</Strong> in which weight loss
              is largely dependent on ongoing treatment, analogous to how blood
              pressure rises again when antihypertensive medication is stopped.
              This is a factual, well-substantiated pattern and is not a
              marketing claim.
            </ArticleP>
          </ArticleSection>

          {/* 6. Dosing */}
          <ArticleSection
            id="dosing"
            number={6}
            title="Drug and Dose Overview (Educational Only)"
          >
            <Callout title="Not a dosing recommendation" tone="caution">
              This section describes titration schedules as published in FDA
              labeling and clinical literature. It is strictly educational and
              is <Strong>not</Strong> a recommendation of what any individual
              should take, at what dose, or for how long. Dosing is a clinical
              decision made solely by a licensed provider. Do not self-adjust
              any dose.
            </Callout>
            <ArticleUl>
              <li>
                <Strong>Semaglutide (Wegovy): FDA-labeled titration:</Strong>{" "}
                Treatment begins at <Strong>0.25 mg once weekly</Strong> and
                escalates approximately every 4 weeks (0.25 → 0.5 → 1.0 → 1.7 →
                2.4 mg), reaching the 2.4 mg maintenance dose at about week 17.
                The 0.25 mg starting dose is explicitly a{" "}
                <Strong>
                  tolerability (initiation) dose, not a therapeutic maintenance
                  dose
                </Strong>
                . Labeling advises that if a patient does not tolerate a step,
                escalation may be delayed. A{" "}
                <Strong>7.2 mg high-dose (Wegovy HD)</Strong> option was
                FDA-approved in 2025 for eligible patients who tolerate 2.4 mg
                <Cite n={19} />.
              </li>
              <li>
                <Strong>Tirzepatide (Zepbound): labeling:</Strong> Structured
                dose escalation to a maximum tolerated dose, commonly{" "}
                <Strong>10 or 15 mg</Strong> once weekly, following a
                &ldquo;start low, go slow&rdquo; schedule
                <Cite n={17} />.
              </li>
            </ArticleUl>
            <ArticleP>
              The gradual escalation exists specifically to{" "}
              <Strong>
                reduce the risk of gastrointestinal adverse reactions
              </Strong>
              , which are most common during and shortly after each dose
              increase
              <Cite n={[19, 26]} />.
            </ArticleP>
          </ArticleSection>

          {/* 7. Cost */}
          <ArticleSection id="cost" number={7} title="Cost Comparison">
            <Callout title="Pricing changes quickly">
              Pricing in this category changed rapidly in 2025-2026 due to
              manufacturer cash-pay programs, government pricing deals, and
              shifting compounding regulations. Verify all figures at the time
              of reading.
            </Callout>

            <Accordion type="multiple" defaultValue={["traditional-cost"]}>
              <AccordionItem
                value="traditional-cost"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Traditional weight-loss costs
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleUl>
                    <li>
                      <Strong>Gym membership:</Strong> GoodRx (2025) reports
                      Americans spend an{" "}
                      <Strong>average of about $65/month</Strong> (&ldquo;$65
                      per month, or $780 annually&rdquo;), with budget chains at
                      $10-$30/month and premium gyms $150-$300+/month
                      <Cite n={20} />.
                    </li>
                    <li>
                      <Strong>Registered dietitian:</Strong> ConsumerAffairs
                      (2026) reports consultations{" "}
                      <Strong>average $100-$200</Strong>, with initial visits
                      commonly $100-$250 and follow-ups $50-$150
                      <Cite n={21} />.
                    </li>
                    <li>
                      <Strong>Meal plans / programs:</Strong> Roughly{" "}
                      <Strong>$75-$300/month</Strong> depending on customization
                      and level of coaching
                      <Cite n={21} />.
                    </li>
                  </ArticleUl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="brand-cost"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Brand-name GLP-1 list prices (before discounts)
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleUl>
                    <li>
                      <Strong>Wegovy (semaglutide):</Strong> List price{" "}
                      <Strong>$1,349.02 per 28-day package</Strong> (per Novo
                      Nordisk/NovoCare)
                      <Cite n={22} />.
                    </li>
                    <li>
                      <Strong>Zepbound (tirzepatide):</Strong> List price{" "}
                      <Strong>roughly $1,086/month</Strong> (per CNBC, Dec 2025)
                      <Cite n={22} />.
                    </li>
                    <li>
                      <Strong>Ozempic (semaglutide, diabetes):</Strong> List
                      price <Strong>$1,027.51</Strong>
                      <Cite n={22} />.
                    </li>
                  </ArticleUl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="cash-pay"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Manufacturer cash-pay programs
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleUl>
                    <li>
                      <Strong>Wegovy (NovoCare):</Strong> New self-pay patients
                      pay{" "}
                      <Strong>
                        $199/month for the first two monthly fills
                      </Strong>{" "}
                      of the 0.25 mg and 0.5 mg doses (through December 31,
                      2026), then <Strong>$349/month</Strong>; Wegovy HD 7.2 mg
                      is <Strong>$399/month</Strong>
                      <Cite n={22} />.
                    </li>
                    <li>
                      <Strong>Zepbound (LillyDirect):</Strong> Single-dose vials
                      at{" "}
                      <Strong>
                        $299/month (2.5 mg starting dose), $399/month (5 mg),
                        and $449/month for all other approved doses
                      </Strong>{" "}
                      (reduced from a prior $499) as of December 1, 2025
                      <Cite n={22} />.
                    </li>
                  </ArticleUl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="compounded-cost"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Beema Health compounded GLP-1 pricing
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <ArticleUl>
                    <li>
                      <Strong>Compounded semaglutide:</Strong>{" "}
                      <Strong>
                        ${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/month
                      </Strong>
                      , billed monthly with no platform membership fee.
                    </li>
                    <li>
                      <Strong>Compounded tirzepatide:</Strong>{" "}
                      <Strong>
                        ${COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd}/month
                      </Strong>
                      , billed monthly with no platform membership fee.
                    </li>
                  </ArticleUl>
                  <ArticleP>
                    Compared with the brand-name list prices above (roughly
                    $1,000-$1,350 per month before discounts)
                    <Cite n={22} />, Beema Health&apos;s compounded cash-pay
                    pricing is about{" "}
                    <Strong>one-fifth the cost of brand-name drugs</Strong> (for
                    example,{" "}
                    {formatUsd(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd)}
                    /month vs. Ozempic list pricing of $1,027.51, or about 1/5).
                    Multi-month plans include a semaglutide first-month promo (
                    {formatUsd(
                      promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING),
                    )}{" "}
                    first month on a 3-month plan, then{" "}
                    {formatUsd(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd)}
                    /mo for months 2 and 3) and tirzepatide maintenance from{" "}
                    {formatUsd(
                      getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 6).monthlyUsd,
                    )}
                    /mo on a 6-month plan, with a new-patient starter pack at{" "}
                    {formatUsd(
                      COMPOUNDED_TIRZEPATIDE_PRICING.starterPack
                        .monthlyEquivalentUsd,
                    )}
                    /mo). A one-time ${PROMO_CODE_DISCOUNT_USD} checkout coupon
                    (once per patient) applies on eligible multi-month plans
                    (not the starter pack). Shipping and labs, when applicable,
                    are shown separately. A prescription is never guaranteed.
                  </ArticleP>
                  <Callout title="Critical compliance note" tone="caution">
                    Compounded medications are <Strong>not FDA-approved</Strong>{" "}
                    and are <Strong>not therapeutically equivalent</Strong> to
                    brand-name products; the FDA has not reviewed them for
                    safety, effectiveness, or quality. The FDA determined the{" "}
                    <Strong>
                      tirzepatide shortage resolved (December 2024)
                    </Strong>{" "}
                    and the{" "}
                    <Strong>
                      semaglutide shortage resolved (February 21, 2025)
                    </Strong>
                    , which ended the shortage-based exemptions that had
                    permitted large-scale compounding; enforcement deadlines
                    followed in 2025, and in 2026 the FDA proposed removing
                    semaglutide, tirzepatide, and liraglutide from the 503B
                    bulks list
                    <Cite n={24} />. Patient-specific 503A compounding remains
                    legal within narrow limits. Marketing must never state or
                    imply that a compounded product is &ldquo;the same
                    as,&rdquo; &ldquo;equivalent to,&rdquo; or &ldquo;identical
                    to&rdquo; Ozempic, Wegovy, Mounjaro, or Zepbound. The FDA
                    issued multiple warning letters to telehealth companies in
                    2025-2026 for exactly this type of messaging
                    <Cite n={[23, 24]} />.
                  </Callout>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="grocery-anecdote"
                className="rounded-2xl border border-border bg-card px-5 mb-3"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Food spending: one patient example
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <Callout title="Single-patient anecdote (not a study result)">
                    This is the experience of <Strong>one patient</Strong> who
                    had been on treatment for <Strong>11 months</Strong>,
                    sharing household food costs for himself and his partner. It
                    is not a clinical trial finding, not an average, and not a
                    guarantee of what anyone else will spend on food or dining
                    out.
                  </Callout>
                  <ArticleP>
                    That patient explained that his monthly grocery bill{" "}
                    <Strong>halved</Strong>, from about{" "}
                    <Strong>$600/month</Strong> previously to about{" "}
                    <Strong>$300/month</Strong> after starting GLP-1 treatment
                    (about <Strong>$300/month</Strong> saved on groceries).
                  </ArticleP>
                  <ArticleP>
                    He also described eating out less often: roughly{" "}
                    <Strong>2 times per month</Strong> while on GLP-1, at about{" "}
                    <Strong>$50 per meal</Strong> (about{" "}
                    <Strong>$100/month</Strong>), compared with roughly{" "}
                    <Strong>12 times per month</Strong> before starting GLP-1 at
                    the same ~$50 per meal (about <Strong>$600/month</Strong>).
                    That is about <Strong>$500/month</Strong> saved on eating
                    out.
                  </ArticleP>
                  <ArticleP>
                    In his accounting, those changes added up to about{" "}
                    <Strong>$800/month</Strong> in food-related savings ($500
                    dining out + $300 groceries). He said that savings was
                    significantly greater than the monthly cost of compounded
                    tirzepatide for both of them (Beema Health compounded
                    tirzepatide is ${COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd}
                    /month per person, or $
                    {COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd * 2}/month for
                    two).
                  </ArticleP>
                  <ArticleP>
                    Appetite, grocery habits, and dining-out habits vary widely.
                    Individual results differ, and food spending can move for
                    many reasons unrelated to medication. Use this only as one
                    person&apos;s report, not as expected savings.
                  </ArticleP>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ArticleSection>

          {/* 8. FAQ */}
          <ArticleSection
            id="faq"
            number={8}
            title="Frequently Asked Questions"
          >
            <Accordion type="single" collapsible className="w-full">
              {INITIAL_RESEARCH_FAQ.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-border bg-card px-5 mb-3"
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

          {/* 9. References */}
          <ArticleSection id="references" number={9} title="References">
            <Accordion type="single" collapsible defaultValue="refs">
              <AccordionItem
                value="refs"
                className="rounded-2xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  Full reference list ({INITIAL_RESEARCH_REFERENCES.length}{" "}
                  sources)
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {INITIAL_RESEARCH_REFERENCES.map((ref, i) => (
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
                  <Link to={cta.to} search={cta.search}>
                    {cta.label} <ArrowRight />
                  </Link>
                </Button>
              </MagneticButton>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              See also{" "}
              <Link
                to="/safety/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                Safety &amp; eligibility
              </Link>
              ,{" "}
              <Link
                to="/semaglutide/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                compounded semaglutide
              </Link>
              , and{" "}
              <Link
                to="/tirzepatide/"
                className="text-foreground underline-offset-2 hover:underline"
              >
                compounded tirzepatide
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}

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
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsdFixed,
  getPlan,
  promoFirstMonthUsd,
} from "@/lib/medication-pricing";
import {
  SEMA_VS_TIRZ_DATE_MODIFIED,
  SEMA_VS_TIRZ_DESCRIPTION,
  SEMA_VS_TIRZ_FAQ,
  SEMA_VS_TIRZ_PATH,
  SEMA_VS_TIRZ_REFERENCES,
  SEMA_VS_TIRZ_TITLE,
  SEMA_VS_TIRZ_TOC,
} from "@/lib/learn/semaglutide-vs-tirzepatide";
import { INITIAL_RESEARCH_PATH } from "@/lib/learn/initial-research";
import { cn } from "@/lib/utils";

const PAGE_TITLE = `${SEMA_VS_TIRZ_TITLE} | Beema Health`;

/**
 * Not clinician-reviewed by design - see the visible disclaimer on the page
 * itself. Every trial figure is reused verbatim from /learn/initial-research
 * (which is clinician-reviewed); this page just presents that same data in
 * a dedicated comparison format. Keep it that way: if new figures are ever
 * added here that don't already appear on /learn/initial-research, get
 * those reviewed first.
 */
export const Route = createFileRoute("/learn/semaglutide-vs-tirzepatide")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: SEMA_VS_TIRZ_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      {
        property: "og:description",
        content: SEMA_VS_TIRZ_DESCRIPTION,
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(SEMA_VS_TIRZ_PATH) }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
            {
              name: "Semaglutide vs. Tirzepatide",
              path: SEMA_VS_TIRZ_PATH,
            },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: SEMA_VS_TIRZ_TITLE,
            description: SEMA_VS_TIRZ_DESCRIPTION,
            path: SEMA_VS_TIRZ_PATH,
            // Intentionally false - see the visible disclaimer on the page.
            reviewedByClinicalLead: false,
            dateModified: SEMA_VS_TIRZ_DATE_MODIFIED,
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(SEMA_VS_TIRZ_FAQ)),
      },
    ],
  }),
  component: SemaVsTirzPage,
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

function SemaVsTirzPage() {
  const cta = resolveCta(CTA_IDS.learn_sema_vs_tirz);
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const semaFirstMonth = formatUsdFixed(promoFirstMonthUsd(sema));
  const semaOngoing = formatUsdFixed(getPlan(sema, 3).monthlyUsd);
  const tirzFrom = tirz.starterPack
    ? formatUsdFixed(tirz.starterPack.monthlyEquivalentUsd)
    : formatUsdFixed(getPlan(tirz, 12).monthlyUsd);

  useEffect(() => {
    trackPageViewed("learn_sema_vs_tirz");
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
                <BreadcrumbPage>Semaglutide vs. Tirzepatide</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <SectionHeading
            as="h1"
            eyebrow="Evidence-based comparison"
            title={SEMA_VS_TIRZ_TITLE}
            description="A cited, side-by-side look at how semaglutide and tirzepatide compare on trial results, side effects, dosing, and cost."
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {SEMA_VS_TIRZ_DATE_MODIFIED}
          </p>
        </div>
      </section>

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          <Callout title="Not reviewed by a clinician" tone="caution">
            This article has <Strong>not</Strong> been reviewed by a licensed
            clinician. It was written for general educational purposes using
            publicly available trial data, and some information may be
            inaccurate, incomplete, or out of date. It is not medical advice.
          </Callout>

          <Callout title="Educational disclaimer" tone="caution">
            Educational content prepared for Beema Health. Beema Health does not
            practice medicine, prescribe, or dispense medications. All clinical
            decisions are made by independent licensed providers, and any
            medications are fulfilled by licensed pharmacy partners. This guide
            is for general educational purposes only and is not medical advice.
            Consult a licensed healthcare professional before starting any
            weight-management program or medication.
          </Callout>

          <nav
            aria-label="Table of contents"
            className="rounded-2xl border border-border bg-background px-5 py-4"
          >
            <p className="text-sm font-semibold text-foreground">
              Table of contents
            </p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {SEMA_VS_TIRZ_TOC.map((item, index) => (
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

        <div className="mx-auto mt-10 max-w-3xl space-y-10">
          {/* 1. Quick answer */}
          <ArticleSection id="answer" number={1} title="Quick Answer">
            <ArticleP>
              Semaglutide and tirzepatide are both once-weekly injectable
              GLP-1-based medications for weight management. Tirzepatide is a
              dual GLP-1/GIP agonist, which is thought to drive its larger
              average weight loss in trials. In the only randomized head-to-head
              trial (SURMOUNT-5), tirzepatide produced greater average weight
              loss than semaglutide - <Strong>20.2% vs. 13.7%</Strong> at 72
              weeks
              <Cite n={5} /> - with a lower rate of GI-related discontinuation.
              Both carry similar gastrointestinal side effects and the same FDA
              boxed warning for thyroid C-cell tumors. Neither is universally
              &ldquo;better&rdquo;: the right medication, if any, is a decision
              a licensed provider makes with each patient individually.
            </ArticleP>
          </ArticleSection>

          {/* 2. Mechanism */}
          <ArticleSection id="mechanism" number={2} title="How Each Drug Works">
            <ArticleP>
              Both drugs are incretin-mimetic therapies that reduce appetite and
              slow gastric emptying rather than directly increasing metabolism
              or &ldquo;burning&rdquo; fat
              <Cite n={1} />.
            </ArticleP>
            <ArticleUl>
              <li>
                <Strong>Semaglutide</Strong> is a GLP-1 (glucagon-like
                peptide-1) receptor agonist. It activates GLP-1 receptors in
                appetite-regulating brain regions (central pathway) and slows
                gastric emptying while enhancing glucose-dependent insulin
                secretion (peripheral pathway)
                <Cite n={1} />.
              </li>
              <li>
                <Strong>Tirzepatide</Strong> is a dual agonist that activates
                both the GLP-1 receptor and the GIP (glucose-dependent
                insulinotropic polypeptide) receptor - a second incretin pathway
                semaglutide does not target. This dual mechanism may contribute
                to tirzepatide&apos;s larger average weight-loss effect in
                trials
                <Cite n={4} />.
              </li>
            </ArticleUl>
          </ArticleSection>

          {/* 3. Head-to-head */}
          <ArticleSection
            id="head-to-head"
            number={3}
            title="Head-to-Head Trial: SURMOUNT-5"
          >
            <ArticleP>
              SURMOUNT-5 (Aronne et al., NEJM 2025) is the only randomized trial
              to compare the two drugs directly in the same population under the
              same protocol
              <Cite n={5} />.
            </ArticleP>
            <ArticleUl>
              <li>
                751 adults with obesity (or overweight plus a weight-related
                condition), no type 2 diabetes.
              </li>
              <li>
                At 72 weeks: tirzepatide <Strong>−20.2%</Strong> body weight vs.
                semaglutide <Strong>−13.7%</Strong> (P&lt;0.001).
              </li>
              <li>
                Tirzepatide also had a lower rate of GI-related treatment
                discontinuation than semaglutide in this trial.
              </li>
            </ArticleUl>
            <Callout title="Read the trial design, not just the headline">
              SURMOUNT-5 was <Strong>open-label</Strong> (patients and
              investigators knew which drug they were taking) and{" "}
              <Strong>funded by tirzepatide&apos;s manufacturer</Strong>. Both
              factors can introduce bias. It is still the best direct evidence
              available comparing the two drugs, but it is one trial, not a
              settled verdict.
            </Callout>
          </ArticleSection>

          {/* 4. Individual trials */}
          <ArticleSection
            id="individual-trials"
            number={4}
            title="Individual Pivotal Trials"
          >
            <ArticleP>
              Outside the head-to-head trial, each drug also has its own
              placebo-controlled pivotal trial. These enrolled different
              populations under different protocols, so treat the numbers below
              as context, not a direct comparison.
            </ArticleP>
            <ArticleUl>
              <li>
                <Strong>
                  Semaglutide 2.4 mg, STEP 1 (Wilding et al., NEJM 2021):
                </Strong>{" "}
                Mean weight loss of <Strong>14.9%</Strong> at 68 weeks vs. 2.4%
                with placebo; 86.4% of the semaglutide group achieved ≥5% loss
                vs. 31.5% placebo
                <Cite n={2} />.
              </li>
              <li>
                <Strong>Semaglutide, STEP 5 (2-year data):</Strong> −
                <Strong>15.2%</Strong> vs. −2.6% placebo at week 104, showing
                the effect holds while treatment continues
                <Cite n={3} />.
              </li>
              <li>
                <Strong>
                  Tirzepatide, SURMOUNT-1 (Jastreboff et al., NEJM 2022):
                </Strong>{" "}
                Mean weight loss of{" "}
                <Strong>16.0% (5 mg), 21.4% (10 mg), and 22.5% (15 mg)</Strong>{" "}
                vs. 2.4% placebo at 72 weeks; 89-96% achieved ≥5% loss
                <Cite n={4} />.
              </li>
            </ArticleUl>
          </ArticleSection>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[9rem]">Dimension</TableHead>
                  <TableHead className="min-w-[11rem]">Semaglutide</TableHead>
                  <TableHead className="min-w-[11rem]">Tirzepatide</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Drug class
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    GLP-1 receptor agonist
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Dual GLP-1 / GIP receptor agonist
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    FDA-approved brand names
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Wegovy (weight management), Ozempic (type 2 diabetes)
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Zepbound (weight management), Mounjaro (type 2 diabetes)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Pivotal trial, mean weight loss
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    14.9% at 68 weeks (STEP 1)
                    <Cite n={2} />
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Up to 22.5% at 72 weeks, 15 mg (SURMOUNT-1)
                    <Cite n={4} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Head-to-head result
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    −13.7% at 72 weeks
                    <Cite n={5} />
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    −20.2% at 72 weeks
                    <Cite n={5} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Most common side effects
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Nausea, diarrhea, vomiting, constipation - most common
                    during titration
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Same GI profile; SURMOUNT-5 reported a lower discontinuation
                    rate than semaglutide
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Dosing frequency
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Once weekly, subcutaneous injection
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Once weekly, subcutaneous injection
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Boxed warning
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Thyroid C-cell tumors (rodent data)
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    Thyroid C-cell tumors (rodent data)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="align-top font-medium text-foreground">
                    Beema Health cash price
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    From {semaFirstMonth}/mo first month, then {semaOngoing}
                    /mo (code {sema.promoCode})
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    From {tirzFrom}/mo
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 5. Side effects */}
          <ArticleSection
            id="side-effects"
            number={5}
            title="Side-Effect Profile"
          >
            <ArticleP>
              Both drugs share the same class of side effects, most common
              during dose titration and usually mild-to-moderate.
            </ArticleP>
            <ArticleUl>
              <li>
                <Strong>Semaglutide (pooled STEP 1-3 data):</Strong> nausea
                43.9% (vs. 16.1% placebo), diarrhea 29.7%, vomiting 24.5%,
                constipation 24.2%; 99.5% of GI events were non-serious, and
                4.3% of patients permanently discontinued due to GI events
                <Cite n={2} />.
              </li>
              <li>
                <Strong>Tirzepatide (SURMOUNT-1):</Strong> nausea 24.6%-33.3%
                depending on dose, with GI-related discontinuation under about
                8%
                <Cite n={4} />.
              </li>
              <li>
                <Strong>Shared boxed warning:</Strong> thyroid C-cell tumors,
                based on rodent data with no confirmed human causation. Both are
                contraindicated in people with a personal or family history of
                medullary thyroid carcinoma or MEN 2. Rarer risks for both
                include pancreatitis and gallbladder events.
              </li>
            </ArticleUl>
          </ArticleSection>

          {/* 6. Dosing */}
          <ArticleSection
            id="dosing"
            number={6}
            title="Dosing and Administration (Educational Only)"
          >
            <Callout title="Not a dosing recommendation" tone="caution">
              This section describes titration patterns as published in FDA
              labeling and clinical literature. It is strictly educational and
              is <Strong>not</Strong> a recommendation of what any individual
              should take, at what dose, or for how long. Dosing is a clinical
              decision made solely by a licensed provider. Do not self-adjust
              any dose.
            </Callout>
            <ArticleUl>
              <li>
                <Strong>Semaglutide:</Strong> FDA labeling starts at 0.25 mg
                once weekly and escalates roughly every 4 weeks (0.25 → 0.5 →
                1.0 → 1.7 → 2.4 mg), reaching the 2.4 mg maintenance dose around
                week 17. The 0.25 mg starting dose is explicitly a tolerability
                dose, not a therapeutic one.
              </li>
              <li>
                <Strong>Tirzepatide:</Strong> a structured, slower dose
                escalation to a maximum tolerated dose, commonly 10 mg or 15 mg
                once weekly, following a &ldquo;start low, go slow&rdquo;
                schedule.
              </li>
            </ArticleUl>
            <ArticleP>
              Both escalation schedules exist specifically to reduce the risk of
              gastrointestinal side effects, which are most common during and
              shortly after each dose increase.
            </ArticleP>
          </ArticleSection>

          {/* 7. Cost */}
          <ArticleSection id="cost" number={7} title="Cost Comparison">
            <Callout title="Pricing changes quickly">
              Pricing in this category changed rapidly in 2025-2026 due to
              manufacturer cash-pay programs, government pricing deals, and
              shifting compounding regulations. Verify current figures before
              relying on them.
            </Callout>
            <ArticleUl>
              <li>
                <Strong>Wegovy (semaglutide) brand list price:</Strong> roughly
                $1,349 per 28-day package. Ozempic (semaglutide, diabetes
                indication) lists around $1,028.
              </li>
              <li>
                <Strong>Zepbound (tirzepatide) brand list price:</Strong>{" "}
                roughly $1,086/month.
              </li>
              <li>
                Both manufacturers run cash-pay savings programs for eligible
                self-pay patients at meaningfully lower prices than list - see
                each manufacturer&apos;s site for current terms.
              </li>
              <li>
                <Strong>Compounded, cash-pay (Beema Health):</Strong> compounded
                semaglutide from {semaFirstMonth}/mo the first month (then{" "}
                {semaOngoing}/mo, code {sema.promoCode}); compounded tirzepatide
                from {tirzFrom}/mo. Compounded medications are prepared by a
                licensed pharmacy rather than manufactured and FDA-approved as a
                finished product, and are not therapeutically equivalent to the
                branded version - they are typically the lowest-cost cash-pay
                path when clinically appropriate and legally available, not a
                claim of being the same product.
              </li>
            </ArticleUl>
          </ArticleSection>

          {/* 8. Choosing */}
          <ArticleSection
            id="choosing"
            number={8}
            title="Which One Is Right for You?"
          >
            <ArticleP>
              This is not a decision a comparison page can make. A licensed
              provider weighs your medical history, current medications,
              tolerance for GI side effects, cost, and goals before recommending
              either drug - or neither. Some patients start on one and switch
              based on how they respond; that, too, is a clinical call, not a
              self-directed one.
            </ArticleP>
            <ArticleP>
              Want the fuller picture first, including how either compares to
              traditional lifestyle-only weight loss?{" "}
              <Link
                to={INITIAL_RESEARCH_PATH}
                className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
              >
                Read the full GLP-1 research guide
              </Link>
              .
            </ArticleP>
          </ArticleSection>

          {/* 9. FAQ */}
          <ArticleSection
            id="faq"
            number={9}
            title="Frequently Asked Questions"
          >
            <Accordion type="single" collapsible className="w-full">
              {SEMA_VS_TIRZ_FAQ.map((item, i) => (
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

          {/* 10. References */}
          <ArticleSection id="references" number={10} title="References">
            <ol className="space-y-2 text-sm text-muted-foreground">
              {SEMA_VS_TIRZ_REFERENCES.map((ref, i) => (
                <li key={ref.href} id={`ref-${i + 1}`} className="scroll-mt-28">
                  [{i + 1}]{" "}
                  <a
                    href={ref.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {ref.label}
                  </a>
                </li>
              ))}
            </ol>
          </ArticleSection>

          <div className="text-center">
            <MagneticButton>
              <Button asChild size="xl">
                <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
                  {cta.label} <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}

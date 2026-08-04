import { useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { MagneticButton, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/components/home/home-motion";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  validateHeightFt,
  validateHeightIn,
  validateWeightLbs,
} from "@/lib/form-validation";
import {
  BMI_CATEGORIES,
  BMI_CTA_THRESHOLD,
  BMI_SCALE_MAX,
  BMI_SCALE_MIN,
  bmiCategory,
  computeBmi,
} from "@/lib/bmi";
import { cn } from "@/lib/utils";

/** Angle convention: 0deg = top (12 o'clock), clockwise-positive — standard SVG gauge math. */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

/** Maps a BMI value onto the -90deg (left) to +90deg (right) gauge sweep, clamped to the scale. */
function bmiToAngle(bmi: number) {
  const clamped = Math.min(Math.max(bmi, BMI_SCALE_MIN), BMI_SCALE_MAX);
  return (
    -90 + ((clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 180
  );
}

const GAUGE_CX = 110;
const GAUGE_CY = 106;
const GAUGE_R = 84;
const GAUGE_STROKE = 14;
const GAUGE_TICKS = [BMI_SCALE_MIN, 18.5, 25, 30, BMI_SCALE_MAX];

type BmiCalculatorProps = {
  /** CTA id from CTA_IDS. Resolved via resolveCta() so this stays a switchboard-safe link. */
  ctaId: (typeof CTA_IDS)[keyof typeof CTA_IDS];
  /**
   * Lowercase medication name used in the CTA callout copy, e.g. "tirzepatide".
   * Omit on general educational pages for medication-neutral copy.
   */
  medicationLabel?: string;
  className?: string;
};

/**
 * Client-side, informational-only BMI calculator for treatment and learn pages.
 * Numbers never leave the browser: no API call, no PHI storage. Deliberately
 * uses a single brand hue across the whole gauge (no red/yellow/green "shaming"
 * color-coding). Categories are shown as plain, evenly-styled rows.
 */
export function BmiCalculator({
  ctaId,
  medicationLabel,
  className,
}: BmiCalculatorProps) {
  const reduceMotion = useReducedMotion();
  const idPrefix = useId();

  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [touched, setTouched] = useState(false);

  const ftError = touched ? validateHeightFt(heightFt) : null;
  const inError = touched ? validateHeightIn(heightIn) : null;
  const weightError = touched ? validateWeightLbs(weightLbs) : null;

  const bmi = useMemo(() => {
    if (validateHeightFt(heightFt) || validateHeightIn(heightIn)) return null;
    if (validateWeightLbs(weightLbs)) return null;
    return computeBmi(Number(heightFt), Number(heightIn), Number(weightLbs));
  }, [heightFt, heightIn, weightLbs]);

  const category = bmi != null ? bmiCategory(bmi) : null;
  const angle = bmiToAngle(bmi ?? BMI_SCALE_MIN);
  const needle = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R, angle);
  const showCta = bmi != null && bmi >= BMI_CTA_THRESHOLD;
  const cta = resolveCta(ctaId);

  const numericField =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setter(e.target.value.replace(/[^\d]/g, "").slice(0, 4));

  return (
    <div
      className={cn("grid gap-8 lg:grid-cols-2 lg:items-stretch", className)}
    >
      <SurfaceCard className="text-left">
        <h3 className="text-lg font-semibold text-foreground">
          BMI calculator
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Body Mass Index estimates whether your weight falls in a typical range
          for your height. It&apos;s a starting point, not a diagnosis. Your
          provider looks at your full health picture.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <span className="text-sm font-medium text-foreground">Height</span>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${idPrefix}-ft`} className="sr-only">
                  Feet
                </label>
                <input
                  id={`${idPrefix}-ft`}
                  inputMode="numeric"
                  placeholder="Feet"
                  value={heightFt}
                  onChange={numericField(setHeightFt)}
                  onBlur={() => setTouched(true)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
                {ftError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ftError}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={`${idPrefix}-in`} className="sr-only">
                  Inches
                </label>
                <input
                  id={`${idPrefix}-in`}
                  inputMode="numeric"
                  placeholder="Inches"
                  value={heightIn}
                  onChange={numericField(setHeightIn)}
                  onBlur={() => setTouched(true)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
                {inError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor={`${idPrefix}-lbs`}
              className="text-sm font-medium text-foreground"
            >
              Weight (lb)
            </label>
            <input
              id={`${idPrefix}-lbs`}
              inputMode="numeric"
              placeholder="Pounds"
              value={weightLbs}
              onChange={numericField(setWeightLbs)}
              onBlur={() => setTouched(true)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            {weightError && (
              <p className="mt-1 text-xs text-muted-foreground">
                {weightError}
              </p>
            )}
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          For general information only. It doesn&apos;t replace a licensed
          provider&apos;s evaluation, and it isn&apos;t part of your medical
          intake.
        </p>
      </SurfaceCard>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
      >
        <div className="bg-grad-ink relative h-full overflow-hidden rounded-4xl p-8 text-center text-ink-foreground">
          <div
            aria-hidden
            className="bg-mesh-glow-dark mesh-drift-reverse pointer-events-none absolute inset-0"
          />
          <div className="relative">
            <svg
              viewBox="0 0 220 130"
              className="mx-auto w-full max-w-xs"
              role="img"
              aria-label={
                bmi != null
                  ? `Your BMI is ${bmi.toFixed(1)}`
                  : "BMI gauge, enter height and weight to see your BMI"
              }
            >
              <path
                d={describeArc(GAUGE_CX, GAUGE_CY, GAUGE_R, -90, 90)}
                fill="none"
                stroke="currentColor"
                className="text-ink-foreground/15"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
              />
              {bmi != null && (
                <path
                  d={describeArc(GAUGE_CX, GAUGE_CY, GAUGE_R, -90, angle)}
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth={GAUGE_STROKE}
                  strokeLinecap="round"
                />
              )}
              {bmi != null && (
                <circle
                  cx={needle.x}
                  cy={needle.y}
                  r={8}
                  className="fill-primary stroke-ink-foreground"
                  strokeWidth={3}
                />
              )}
              {GAUGE_TICKS.map((t) => {
                const p = polarToCartesian(
                  GAUGE_CX,
                  GAUGE_CY,
                  GAUGE_R + 18,
                  bmiToAngle(t),
                );
                return (
                  <text
                    key={t}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-ink-foreground/45 text-[9px]"
                  >
                    {t}
                  </text>
                );
              })}
            </svg>

            <p className="text-sm text-ink-foreground/60">Your BMI</p>
            <p className="text-5xl font-bold text-primary">
              {bmi != null ? bmi.toFixed(1) : "-"}
            </p>

            <div className="mt-6 space-y-1.5 text-left">
              {BMI_CATEGORIES.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-2 text-sm transition-colors",
                    category === c.id
                      ? "bg-ink-foreground/10 text-ink-foreground"
                      : "text-ink-foreground/45",
                  )}
                >
                  <span>{c.label}</span>
                  <span>{c.range}</span>
                </div>
              ))}
            </div>

            {showCta && (
              <div className="mt-6 rounded-2xl bg-ink-foreground/10 p-5 text-left">
                <p className="text-sm leading-relaxed text-ink-foreground/85">
                  {medicationLabel
                    ? `Based on your BMI, compounded ${medicationLabel} through Beema Health may be worth exploring with a licensed provider.`
                    : "Based on your BMI, GLP-1 care through Beema Health may be worth exploring with a licensed provider."}
                </p>
                <MagneticButton className="mt-4 block">
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link to={cta.to} search={cta.search}>
                      {cta.label} <ArrowRight />
                    </Link>
                  </Button>
                </MagneticButton>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

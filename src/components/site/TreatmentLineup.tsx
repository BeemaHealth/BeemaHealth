import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { cn } from "@/lib/utils";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatCompoundedPriceLine,
  formatStartingAtPerMonth,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import { Reveal } from "@/components/site/primitives";
import compoundedSemaglutideVialImg from "@/assets/treatments/compounded-semaglutide-vial.png";
import compoundedTirzepatideVialImg from "@/assets/treatments/compounded-tirzepatide-vial.png";

type Treatment = {
  id: string;
  name: string;
  form: string;
  pricing: CompoundedMedicationPricing;
  badge?: string;
  fdaApproved: boolean;
  image: string;
  imageAlt: string;
};

const TREATMENTS: Treatment[] = [
  {
    id: "compounded-semaglutide",
    name: "Compounded Semaglutide",
    form: "Weekly injection, if prescribed",
    pricing: COMPOUNDED_SEMAGLUTIDE_PRICING,
    badge: "Cash-pay option",
    fdaApproved: false,
    image: compoundedSemaglutideVialImg,
    imageAlt: "Beema Health compounded semaglutide injection vial",
  },
  {
    id: "compounded-tirzepatide",
    name: "Compounded Tirzepatide",
    form: "Weekly injection, if prescribed",
    pricing: COMPOUNDED_TIRZEPATIDE_PRICING,
    badge: "Cash-pay option",
    fdaApproved: false,
    image: compoundedTirzepatideVialImg,
    imageAlt: "Beema Health compounded tirzepatide injection vial",
  },
];

export function TreatmentLineup() {
  return (
    <section className="bg-muted/40 py-16 md:py-20">
      <div className="veya-container">
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            GLP-1 weight-loss options
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Transparent cash pricing on every option: first-month offer and
            ongoing monthly rate, with no membership fee.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {TREATMENTS.map((t, i) => (
            <TreatmentCard key={t.id} treatment={t} index={i} />
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium">†</span> Listed prices are medication
            only (cash-pay), if prescribed. Final cost depends on your provider
            decision as well as dosage recommendation. Treatment availability
            depends on your intake, clinical eligibility, and a licensed
            provider&apos;s independent decision. Compounded semaglutide and
            compounded tirzepatide are not FDA-approved and are only considered
            when legally available and clinically appropriate. Completing intake
            does not guarantee a prescription.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Cursor-driven tilt (rotateX/rotateY via pointer position) layered on top
 * of the existing lift/shadow treatment. No-ops under reduced motion and on
 * touch (no mousemove without a real pointer), so it only ever adds polish.
 */
function TreatmentCard({
  treatment,
  index,
}: {
  treatment: Treatment;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rotateXValue = useMotionValue(0);
  const rotateYValue = useMotionValue(0);
  const springRotateX = useSpring(rotateXValue, {
    stiffness: 220,
    damping: 22,
  });
  const springRotateY = useSpring(rotateYValue, {
    stiffness: 220,
    damping: 22,
  });

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateYValue.set(px * 8);
    rotateXValue.set(py * -8);
  }

  function handleMouseLeave() {
    rotateXValue.set(0);
    rotateYValue.set(0);
  }

  return (
    <motion.article
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay: reduceMotion ? 0 : index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={
        reduceMotion
          ? undefined
          : {
              rotateX: springRotateX,
              rotateY: springRotateY,
              transformPerspective: 800,
            }
      }
      className={cn(
        "group relative flex min-h-[400px] flex-col overflow-hidden rounded-3xl sm:min-h-[420px] md:min-h-[480px]",
        "bg-primary-soft shadow-lift",
      )}
    >
      {treatment.badge && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {treatment.badge}
        </span>
      )}

      {treatment.fdaApproved && (
        <span
          className="absolute right-4 top-4 z-10 grid size-12 place-items-center rounded-full border border-primary/20 bg-background/90 text-center text-[6px] font-bold uppercase leading-tight text-primary shadow-sm"
          aria-label="FDA approved for weight loss"
        >
          FDA
          <br />
          approved
        </span>
      )}

      <div className="relative min-h-[200px] flex-[1.4] overflow-hidden sm:min-h-[220px] md:min-h-[280px]">
        <img
          src={treatment.image}
          alt={treatment.imageAlt}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="space-y-1 px-6 pb-8 pt-4 md:px-8 md:pb-10 md:pt-5">
        <h3 className="text-2xl font-bold text-foreground md:text-[1.75rem]">
          {treatment.name}
        </h3>
        <p className="text-sm font-semibold text-foreground">
          {formatStartingAtPerMonth(treatment.pricing)}
          <span className="font-normal text-muted-foreground">†</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {formatCompoundedPriceLine(treatment.pricing)}
        </p>
        <p className="text-sm font-medium text-foreground/80">
          {treatment.form}
        </p>
      </div>
    </motion.article>
  );
}

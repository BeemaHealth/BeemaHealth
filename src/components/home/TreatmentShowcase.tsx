import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineReveal, EASE_OUT } from "@/components/home/home-motion";
import compoundedSemaglutideVialImg from "@/assets/treatments/compounded-semaglutide-vial.png";
import compoundedTirzepatideVialImg from "@/assets/treatments/compounded-tirzepatide-vial.png";

type Treatment = {
  id: string;
  name: string;
  form: string;
  badge: string;
  image: string;
  imageAlt: string;
};

/**
 * Motion-wrapped router Link — defined once at module scope so its identity
 * is stable across renders (recreating it per-render would remount the
 * card and drop the tilt/reveal animation state).
 */
const MotionLink = motion.create(Link);

const TREATMENTS: Treatment[] = [
  {
    id: "compounded-semaglutide",
    name: "Compounded Semaglutide",
    form: "Weekly injection, if prescribed",
    badge: "Cash-pay option",
    image: compoundedSemaglutideVialImg,
    imageAlt: "Beema Health compounded semaglutide injection vial",
  },
  {
    id: "compounded-tirzepatide",
    name: "Compounded Tirzepatide",
    form: "Weekly injection, if prescribed",
    badge: "Cash-pay option",
    image: compoundedTirzepatideVialImg,
    imageAlt: "Beema Health compounded tirzepatide injection vial",
  },
];

/**
 * GLP-1 treatment options grid. A giant outlined "GLP-1" word drifts behind
 * the cards, each card tilts toward the cursor and its vial image drifts
 * slightly on scroll — the section ref drives one shared scroll progress so
 * both images move in the same rhythm.
 */
export function TreatmentShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -24],
  );

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-muted/40 py-16 md:py-24"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 select-none whitespace-nowrap text-center text-[18vw] font-bold leading-none text-outline-primary"
      >
        GLP-1
      </span>

      <div className="veya-container relative z-10">
        <h2 className="max-w-2xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          <LineReveal>GLP-1 weight-loss options</LineReveal>
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {TREATMENTS.map((treatment, index) => (
            <TreatmentCard
              key={treatment.id}
              treatment={treatment}
              index={index}
              imageY={imageY}
            />
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          Final cost depends on your provider decision as well as dosage
          recommendation. Treatment availability depends on your intake,
          clinical eligibility, and a licensed provider&apos;s independent
          decision. Compounded semaglutide and compounded tirzepatide are not
          FDA-approved and are only considered when legally available and
          clinically appropriate. Completing intake does not guarantee a
          prescription.
        </p>
      </div>
    </section>
  );
}

/**
 * Cursor-driven tilt (rotateX/rotateY via pointer position) layered on top
 * of a staggered, slightly-rotated scroll-in reveal. Both no-op under
 * reduced motion. `imageY` is a shared scroll-linked motion value from the
 * parent section so both cards' vial images drift together.
 */
function TreatmentCard({
  treatment,
  index,
  imageY,
}: {
  treatment: Treatment;
  index: number;
  imageY: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLAnchorElement>(null);
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

  function handleMouseMove(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (reduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateYValue.set(px * 10);
    rotateXValue.set(py * -10);
  }

  function handleMouseLeave() {
    rotateXValue.set(0);
    rotateYValue.set(0);
  }

  const rotateOffset = index % 2 === 0 ? -2 : 2;

  return (
    <MotionLink
      ref={cardRef}
      to="/weight-loss"
      aria-label={`Learn more about ${treatment.name} on the weight-loss page`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 32, rotate: reduceMotion ? 0 : rotateOffset }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: reduceMotion ? 0 : 0.6,
        delay: reduceMotion ? 0 : index * 0.15,
        ease: EASE_OUT,
      }}
      style={
        reduceMotion
          ? undefined
          : {
              rotateX: springRotateX,
              rotateY: springRotateY,
              transformPerspective: 900,
            }
      }
      className={cn(
        "group relative flex min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-4xl bg-primary-soft shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-[480px]",
      )}
    >
      <span className="absolute left-5 top-5 z-10 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
        {treatment.badge}
      </span>

      <div className="relative min-h-[220px] flex-[1.4] overflow-hidden md:min-h-[280px]">
        <motion.img
          src={treatment.image}
          alt={treatment.imageAlt}
          style={reduceMotion ? undefined : { y: imageY }}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>

      <div className="space-y-1 px-6 pb-6 pt-5 md:px-8 md:pb-8 md:pt-6">
        <h3 className="text-2xl font-bold text-foreground md:text-[1.75rem]">
          {treatment.name}
        </h3>
        <p className="text-sm font-medium text-foreground/80">
          {treatment.form}
        </p>
      </div>

      <div className="flex items-center gap-1.5 px-6 pb-8 text-sm font-semibold text-accent-foreground md:px-8 md:pb-10">
        <span>Learn more</span>
        <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
      </div>
    </MotionLink>
  );
}

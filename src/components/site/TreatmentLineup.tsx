import { cn } from "@/lib/utils";
import compoundedSemaglutideVialImg from "@/assets/treatments/compounded-semaglutide-vial.png";
import compoundedTirzepatideVialImg from "@/assets/treatments/compounded-tirzepatide-vial.png";

type Treatment = {
  id: string;
  name: string;
  form: string;
  generic: string;
  priceFrom: string;
  badge?: string;
  fdaApproved: boolean;
  image: string;
  imageAlt: string;
};

const TREATMENTS: Treatment[] = [
  {
    id: "compounded-semaglutide",
    name: "Compounded Semaglutide",
    form: "Weekly injection",
    generic: "Compounded, if prescribed",
    priceFrom: "$199",
    badge: "Cash-pay option",
    fdaApproved: false,
    image: compoundedSemaglutideVialImg,
    imageAlt: "Beema Health compounded semaglutide injection vial",
  },
  {
    id: "compounded-tirzepatide",
    name: "Compounded Tirzepatide",
    form: "Weekly injection",
    generic: "Compounded, if prescribed",
    priceFrom: "$249",
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
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          GLP-1 weight-loss options
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {TREATMENTS.map((t) => (
            <TreatmentCard key={t.id} treatment={t} />
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          {/* Pricing disclaimer disabled along with per-treatment pricing above.
          <span className="font-medium">†</span>From pricing includes medication only, if prescribed.
          */}
          Final cost depends on your plan, pharmacy, and provider decision.
          Treatment availability depends on your intake, clinical eligibility,
          and a licensed provider&apos;s independent decision. Brand-name
          medications are FDA-approved for chronic weight management where
          indicated. Compounded semaglutide and tirzepatide are not FDA-approved
          and are only considered when legally available and clinically
          appropriate. Completing intake does not guarantee a prescription.
        </p>
      </div>
    </section>
  );
}

function TreatmentCard({ treatment }: { treatment: Treatment }) {
  return (
    <article
      className={cn(
        "relative flex min-h-[400px] flex-col overflow-hidden rounded-3xl sm:min-h-[420px] md:min-h-[480px]",
        "bg-primary-soft shadow-lift md:transition-[transform,box-shadow] md:duration-300 md:hover:-translate-y-1 md:hover:shadow-soft",
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
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>

      <div className="space-y-1 px-6 pb-8 pt-4 md:px-8 md:pb-10 md:pt-5">
        <h3 className="text-2xl font-bold text-foreground md:text-[1.75rem]">
          {treatment.name}
        </h3>
        {/* Pricing disabled — pricing model not finalized yet.
        <p className="text-sm font-semibold text-foreground/90">
          From {treatment.priceFrom}/mo
          <span className="font-normal text-foreground/70">†</span>
        </p>
        */}
        <p className="text-sm font-medium text-foreground/80">
          {treatment.form}
        </p>
        <p className="text-sm text-foreground/65">{treatment.generic}</p>
      </div>
    </article>
  );
}

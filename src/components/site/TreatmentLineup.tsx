import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import zepboundPenImg from "@/assets/treatments/zepbound-pen.png";
import wegovyPillImg from "@/assets/treatments/wegovy-pill.png";
import wegovyPenImg from "@/assets/treatments/wegovy-pen.png";
import compoundedPenImg from "@/assets/treatments/compounded-pen.png";

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
    id: "zepbound",
    name: "Zepbound®",
    form: "Weekly injection",
    generic: "Tirzepatide",
    priceFrom: "$199",
    fdaApproved: true,
    image: zepboundPenImg,
    imageAlt: "Zepbound tirzepatide KwikPen auto-injector",
  },
  {
    id: "wegovy-pill",
    name: "Wegovy®",
    form: "Daily pill, if prescribed",
    generic: "Semaglutide",
    priceFrom: "$149",
    badge: "Pill option",
    fdaApproved: true,
    image: wegovyPillImg,
    imageAlt: "Wegovy semaglutide oral tablet",
  },
  {
    id: "wegovy-pen",
    name: "Wegovy®",
    form: "Weekly injection",
    generic: "Semaglutide",
    priceFrom: "$199",
    fdaApproved: true,
    image: wegovyPenImg,
    imageAlt: "Wegovy semaglutide injection pen",
  },
  {
    id: "compounded",
    name: "Semaglutide",
    form: "Weekly injection",
    generic: "Compounded, if prescribed",
    priceFrom: "$199",
    badge: "Cash-pay option",
    fdaApproved: false,
    image: compoundedPenImg,
    imageAlt: "Compounded semaglutide injection pen",
  },
];

export function TreatmentLineup() {
  return (
    <section className="bg-muted/40 py-16 md:py-20">
      <div className="veya-container">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          GLP-1 weight-loss options
        </h2>

        <div className="relative mt-10">
          <Carousel opts={{ align: "start", loop: false }} className="w-full">
            <CarouselContent className="-ml-4">
              {TREATMENTS.map((t) => (
                <CarouselItem
                  key={t.id}
                  className="basis-[85%] pl-4 sm:basis-[55%] lg:basis-1/4"
                >
                  <TreatmentCard treatment={t} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 border-border bg-card text-foreground hover:bg-muted md:-left-5" />
            <CarouselNext className="right-2 border-border bg-card text-foreground hover:bg-muted md:-right-5" />
          </Carousel>
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          {/* Pricing disclaimer disabled along with per-treatment pricing above.
          <span className="font-medium">†</span>From pricing includes medication only, if prescribed.
          */}
          Final cost depends on your plan, pharmacy, and provider decision.
          Treatment availability depends on your intake, clinical eligibility,
          and a licensed provider&apos;s independent decision. Brand-name
          medications are FDA-approved for chronic weight management where
          indicated. Compounded semaglutide is not FDA-approved and is only
          considered when legally available and clinically appropriate.
          Completing intake does not guarantee a prescription.
        </p>
      </div>
    </section>
  );
}

function TreatmentCard({ treatment }: { treatment: Treatment }) {
  return (
    <article
      className={cn(
        "relative flex h-[420px] flex-col overflow-hidden rounded-3xl",
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

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={treatment.image}
          alt={treatment.imageAlt}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>

      <div className="space-y-0.5 px-6 pb-8 pt-2">
        <h3 className="text-2xl font-bold text-foreground">{treatment.name}</h3>
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

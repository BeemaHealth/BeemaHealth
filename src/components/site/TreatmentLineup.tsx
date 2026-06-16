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
  badge?: string;
  fdaApproved: boolean;
  image: string;
  imageAlt: string;
  imageClassName?: string;
};

const TREATMENTS: Treatment[] = [
  {
    id: "zepbound",
    name: "Zepbound®",
    form: "Weekly injection",
    generic: "Tirzepatide",
    fdaApproved: true,
    image: zepboundPenImg,
    imageAlt: "Zepbound tirzepatide KwikPen auto-injector",
    imageClassName: "h-56",
  },
  {
    id: "wegovy-pill",
    name: "Wegovy®",
    form: "Daily pill, if prescribed",
    generic: "Semaglutide",
    badge: "Pill option",
    fdaApproved: true,
    image: wegovyPillImg,
    imageAlt: "Wegovy semaglutide oral tablet",
    imageClassName: "h-32",
  },
  {
    id: "wegovy-pen",
    name: "Wegovy®",
    form: "Weekly injection",
    generic: "Semaglutide",
    fdaApproved: true,
    image: wegovyPenImg,
    imageAlt: "Wegovy semaglutide injection pen",
    imageClassName: "h-56",
  },
  {
    id: "compounded",
    name: "Compounded semaglutide",
    form: "Weekly injection",
    generic: "Semaglutide",
    badge: "Cash-pay option",
    fdaApproved: false,
    image: compoundedPenImg,
    imageAlt: "Compounded semaglutide injection pen",
    imageClassName: "h-56",
  },
];

export function TreatmentLineup() {
  return (
    <section className="bg-muted/40 py-16 md:py-20">
      <div className="veya-container">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Provider-reviewed weight-loss options
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
          Treatment availability depends on your intake, clinical eligibility, and a
          licensed provider&apos;s independent decision. Brand-name medications are
          FDA-approved for chronic weight management where indicated. Compounded
          semaglutide is not FDA-approved and is only considered when legally available
          and clinically appropriate. Completing intake does not guarantee a prescription.
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
        "border border-border bg-card shadow-lift",
      )}
    >
      {treatment.badge && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {treatment.badge}
        </span>
      )}

      {treatment.fdaApproved && (
        <span
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full border border-primary/25 bg-primary-soft text-center text-[6px] font-bold uppercase leading-tight text-primary"
          aria-label="FDA approved for weight loss"
        >
          FDA
          <br />
          approved
        </span>
      )}

      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-primary-soft/20 to-card px-6 pt-14">
        <img
          src={treatment.image}
          alt={treatment.imageAlt}
          className={cn(
            "w-auto max-w-[85%] object-contain drop-shadow-lg",
            treatment.imageClassName ?? "h-48",
          )}
        />
      </div>

      <div className="space-y-1 border-t border-border bg-card px-6 py-6">
        <h3 className="text-2xl font-bold text-foreground">{treatment.name}</h3>
        <p className="text-sm font-medium text-foreground/80">{treatment.form}</p>
        <p className="text-sm text-muted-foreground">{treatment.generic}</p>
      </div>
    </article>
  );
}

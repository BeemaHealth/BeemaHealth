import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type Visual = "pen-primary" | "pen-secondary" | "pen-muted" | "pill";

type Treatment = {
  id: string;
  name: string;
  form: string;
  generic: string;
  badge?: string;
  fdaApproved: boolean;
  visual: Visual;
};

const TREATMENTS: Treatment[] = [
  {
    id: "zepbound",
    name: "Zepbound®",
    form: "Weekly injection",
    generic: "Tirzepatide",
    fdaApproved: true,
    visual: "pen-primary",
  },
  {
    id: "wegovy-pill",
    name: "Wegovy®",
    form: "Daily pill, if prescribed",
    generic: "Semaglutide",
    badge: "Pill option",
    fdaApproved: true,
    visual: "pill",
  },
  {
    id: "wegovy-pen",
    name: "Wegovy®",
    form: "Weekly injection",
    generic: "Semaglutide",
    fdaApproved: true,
    visual: "pen-secondary",
  },
  {
    id: "compounded",
    name: "Compounded semaglutide",
    form: "Weekly injection",
    generic: "Semaglutide",
    badge: "Cash-pay option",
    fdaApproved: false,
    visual: "pen-muted",
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

      <div className="flex flex-1 items-center justify-center bg-primary-soft/25 px-6 pt-14">
        <ProductVisual type={treatment.visual} />
      </div>

      <div className="space-y-1 border-t border-border bg-card px-6 py-6">
        <h3 className="text-2xl font-bold text-foreground">{treatment.name}</h3>
        <p className="text-sm font-medium text-foreground/80">{treatment.form}</p>
        <p className="text-sm text-muted-foreground">{treatment.generic}</p>
      </div>
    </article>
  );
}

function ProductVisual({ type }: { type: Visual }) {
  if (type === "pill") {
    return (
      <svg viewBox="0 0 160 160" className="h-36 w-auto drop-shadow-md" aria-hidden>
        <ellipse cx="80" cy="82" rx="52" ry="28" fill="var(--color-card)" stroke="var(--color-border)" strokeWidth="2" />
        <ellipse cx="80" cy="78" rx="48" ry="24" fill="var(--color-background)" />
        <ellipse cx="80" cy="76" rx="18" ry="10" fill="var(--color-primary-soft)" opacity="0.8" />
        <text x="80" y="80" textAnchor="middle" fill="var(--color-primary)" fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">
          novo
        </text>
      </svg>
    );
  }

  const bodyFill =
    type === "pen-primary"
      ? "var(--color-primary)"
      : type === "pen-secondary"
        ? "var(--color-secondary)"
        : "var(--color-muted-foreground)";

  const capFill =
    type === "pen-primary"
      ? "var(--color-primary-soft)"
      : type === "pen-secondary"
        ? "var(--color-secondary-foreground)"
        : "var(--color-muted)";

  return (
    <svg viewBox="0 0 120 280" className="h-52 w-auto drop-shadow-md" aria-hidden>
      <rect x="44" y="8" width="32" height="24" rx="6" fill={capFill} />
      <rect x="40" y="28" width="40" height="200" rx="20" fill={bodyFill} />
      <rect x="48" y="228" width="24" height="36" rx="8" fill={bodyFill} opacity="0.85" />
      <ellipse cx="60" cy="120" rx="7" ry="36" fill="white" opacity="0.2" />
      <circle cx="60" cy="18" r="5" fill="var(--color-background)" opacity="0.9" />
    </svg>
  );
}

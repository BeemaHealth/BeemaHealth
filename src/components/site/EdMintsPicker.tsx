import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FullScreenMobileDialogContent } from "@/components/site/FullScreenMobileDialog";
import { CTA_IDS, resolveCta, type CtaId } from "@/lib/cta-ids";
import { cn } from "@/lib/utils";
import edMintsRdtPhoto from "@/assets/treatments/ed-mints-tadalafil-sildenafil-rdt.webp";
import edMintsOdtPhoto from "@/assets/treatments/ed-mints-sildenafil-tadalafil-oxytocin-odt.webp";

/**
 * ED Mints formulation picker - extracted from ed-mints.tsx (2026-09-03) so
 * the homepage GetStartedModal can render the exact same "choose your
 * formulation -> Continue" step for its Sexual Health -> ED Mints branch,
 * instead of re-implementing it. /ed-mints still owns this component's only
 * other call site; keep both in sync when editing.
 */

/**
 * Picker modal options (2026-09-03, labels per Matt 2026-09-03). "Most
 * Common" / "Highest Strength" are directional labels based on ingredient
 * mix and dose (product 2 has a higher tadalafil dose - 20mg vs 12mg - plus
 * a 3rd ingredient), not an efficacy/outcome claim - the disclaimer under
 * the cards says so explicitly, matching the site's no-outcome-guarantee
 * rule (docs/features/treatment-pages.md). No pricing anywhere here
 * (2026-09-03, per Matt) - pricing for both formulations is shown only
 * during the Bask questionnaire after "Continue"; don't reintroduce a price
 * display here without checking with Matt first. Each option has its own
 * real product photo (2026-09-03, per Matt) - grey for the RDT (also the
 * ed-mints.tsx page hero shot), orange for the ODT - stored under
 * descriptive filenames in src/assets/treatments/ for image-search SEO, with
 * per-product `alt` text naming the exact formulation and dose.
 */
export type MintOption = {
  id: "rdt" | "odt";
  ctaId: CtaId;
  badge: string;
  name: string;
  dose: string;
  photo: string;
  photoAlt: string;
  description: string;
  bullets: string[];
  profile: string;
};

export const MINT_OPTIONS: MintOption[] = [
  {
    id: "rdt",
    ctaId: CTA_IDS.ed_mints_rdt_hero,
    badge: "Most Common",
    name: "Tadalafil + Sildenafil",
    dose: "12mg / 60mg RDT",
    photo: edMintsRdtPhoto,
    photoAlt:
      "Beema Health ED Mints - Tadalafil 12mg + Sildenafil 60mg rapidly dissolving tablet (RDT)",
    description:
      "A 2-ingredient formula combining tadalafil and sildenafil into one rapidly dissolving tablet.",
    bullets: [
      "2 active ingredients",
      "Rapidly dissolving tablet (RDT)",
      "No water needed",
    ],
    profile: "Profile: 2 active ingredients",
  },
  {
    id: "odt",
    ctaId: CTA_IDS.ed_mints_odt_hero,
    badge: "Highest Strength",
    name: "Sildenafil + Tadalafil + Oxytocin",
    dose: "50mg / 20mg / 125 IU ODT",
    photo: edMintsOdtPhoto,
    photoAlt:
      "Beema Health ED Mints - Sildenafil 50mg + Tadalafil 20mg + Oxytocin 125 IU orally dissolving tablet (ODT)",
    description:
      "A 3-ingredient formula combining sildenafil, tadalafil, and oxytocin into one orally dissolving tablet.",
    bullets: [
      "3 active ingredients",
      "Orally dissolving tablet (ODT)",
      "No water needed",
    ],
    profile: "Profile: 3 active ingredients",
  },
];

export function EdMintsPickerModal({
  open,
  onOpenChange,
  initialSelected,
  onBack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelected: "rdt" | "odt";
  /**
   * Optional "Back" button in the footer, next to Continue - used by
   * GetStartedModal (2026-09-04) to return to Sexual Health's product step
   * (Tadalafil / Sildenafil / ED Mints) instead of just closing. /ed-mints
   * doesn't pass this (there's no prior step to return to on that route),
   * so its Continue-only footer is unchanged.
   */
  onBack?: () => void;
}) {
  const [selected, setSelected] = useState<"rdt" | "odt">(initialSelected);

  useEffect(() => {
    if (open) setSelected(initialSelected);
  }, [open, initialSelected]);

  const activeOption = MINT_OPTIONS.find((o) => o.id === selected)!;
  const continueCta = resolveCta(activeOption.ctaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FullScreenMobileDialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl sm:text-3xl">
            Choose your formulation
          </DialogTitle>
          <DialogDescription className="text-center">
            Both options dissolve under the tongue and are prescription-only,
            reviewed by licensed providers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {MINT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              aria-pressed={selected === opt.id}
              className={cn(
                "flex cursor-pointer flex-col rounded-2xl border p-4 text-left transition-colors",
                selected === opt.id
                  ? "border-primary bg-primary-soft/40 ring-2 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted",
              )}
            >
              <span className="inline-flex w-fit items-center rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                {opt.badge}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {opt.name}
              </h3>
              <p className="text-xs text-muted-foreground">{opt.dose}</p>
              <img
                src={opt.photo}
                alt={opt.photoAlt}
                width={1024}
                height={1024}
                loading="lazy"
                className="mx-auto my-4 w-24"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {opt.description}
              </p>
              <ul className="mt-3 space-y-1.5">
                {opt.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-xs text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent-foreground" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                {opt.profile}
              </p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          &quot;{MINT_OPTIONS[0].badge}&quot; and &quot;
          {MINT_OPTIONS[1].badge}&quot; are directional labels based on
          ingredient mix and dose, not a guarantee of results. Your provider
          decides which formulation, if any, is clinically appropriate for you.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4" /> HIPAA-compliant & encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> Licensed providers
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-4" /> Private & secure intake
          </span>
        </div>

        <DialogFooter className="gap-3 sm:justify-center sm:space-x-0">
          {onBack ? (
            <Button type="button" variant="ghost" onClick={onBack}>
              <ArrowLeft /> Back
            </Button>
          ) : null}
          <Button asChild size="xl" className="w-full sm:w-auto">
            <Link
              to={continueCta.to}
              search={continueCta.search}
              onClick={continueCta.onClick}
            >
              Continue <ArrowRight />
            </Link>
          </Button>
        </DialogFooter>
        <p className="text-center text-xs text-muted-foreground">
          Completing intake does not guarantee a prescription.
        </p>
      </FullScreenMobileDialogContent>
    </Dialog>
  );
}

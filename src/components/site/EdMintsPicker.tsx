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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FullScreenMobileDialogContent } from "@/components/site/FullScreenMobileDialog";
import { CTA_IDS, resolveCta, type CtaId } from "@/lib/cta-ids";
import {
  ED_MINTS_RDT_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
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
 * rule (docs/features/treatment-pages.md). Both formulations are the same
 * price - a shared price line renders once above the cards rather than
 * per-card (2026-09-27, reversing the 2026-09-03 "no pricing anywhere here"
 * decision - Google Ads flagged the hidden pricing as a landing-page-
 * experience problem; see docs/features/treatment-pages.md). Each option
 * has its own real product photo - grey for the RDT (2026-09-03, per Matt),
 * blue for the ODT (2026-09-27, replacing the earlier orange shot to match
 * the ed-mints.tsx page hero, which switched to the same blue tablet photo
 * the same day) - stored under descriptive filenames in
 * src/assets/treatments/ for image-search SEO, with per-product `alt` text
 * naming the exact formulation and dose.
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
];

export function EdMintsPickerModal({
  open,
  onOpenChange,
  onBack,
  ctaIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * @deprecated No longer used: there is no select-then-continue step, each
   * formulation is its own link. Kept so existing callers still compile.
   */
  initialSelected?: "rdt" | "odt";
  /**
   * Optional "Back" button in the top-left corner - used by GetStartedModal
   * (2026-09-04) to return to Sexual Health's product step (Tadalafil /
   * Sildenafil / ED Mints) instead of just closing. /ed-mints doesn't pass
   * this (there's no prior step to return to on that route).
   */
  onBack?: () => void;
  /**
   * Opt-in CTA id override per formulation, for a caller that must attribute
   * the click to its own page (the Sexual Health picker). Omitted by default,
   * so every existing caller keeps the ed_mints_* ids.
   */
  ctaIds?: Partial<Record<"rdt" | "odt", CtaId>>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FullScreenMobileDialogContent>
        {/* Back sits in the top-left corner, mirroring the close X on the right. */}
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute left-3 top-3 h-10 gap-1 px-3 text-sm"
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
        ) : null}
        <DialogHeader className={onBack ? "pt-9" : undefined}>
          <DialogTitle className="text-center text-2xl sm:text-3xl">
            Choose your formulation
          </DialogTitle>
          <DialogDescription className="text-center">
            Tap one to continue. Both dissolve under the tongue and are
            prescription-only.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/40 bg-primary-soft/60 px-4 py-3 text-center shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
            Both formulations
          </p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            from {formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING)}
          </p>
        </div>

        {/* Each option is a link straight to its questionnaire: one tap, no
            select-then-scroll-then-continue. On a phone the two cards share the
            sheet's height so both are easy to hit with a thumb. */}
        <div className="flex flex-1 flex-col gap-4 sm:grid sm:flex-none sm:grid-cols-2">
          {MINT_OPTIONS.map((opt) => {
            const cta = resolveCta(ctaIds?.[opt.id] ?? opt.ctaId);
            return (
              <Link
                key={opt.id}
                to={cta.to}
                search={cta.search}
                onClick={cta.onClick}
                className="group flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4 outline-none transition-colors hover:border-primary hover:bg-primary-soft/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary sm:flex-none sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex w-fit items-center rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                      {opt.badge}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {opt.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{opt.dose}</p>
                  </div>
                  <img
                    src={opt.photo}
                    alt={opt.photoAlt}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="w-16 shrink-0 sm:w-24"
                  />
                </div>
                <p className="hidden text-sm leading-relaxed text-muted-foreground sm:block">
                  {opt.description}
                </p>
                <ul className="space-y-1.5">
                  {opt.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                      {b}
                    </li>
                  ))}
                </ul>
                <span className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
                  Continue <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
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

        <p className="text-center text-xs text-muted-foreground">
          Completing intake does not guarantee a prescription.
        </p>
      </FullScreenMobileDialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  HeartPulse,
  Scale,
  Sparkles,
  Zap,
  type LucideIcon,
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
import { EdMintsPickerModal } from "@/components/site/EdMintsPicker";
import { CTA_IDS, resolveCta, type CtaId } from "@/lib/cta-ids";
import { cn } from "@/lib/utils";

/**
 * Reusable "Get Started" category -> product picker (2026-09-04). Wired
 * into the homepage hero today only - see docs/features/homepage.md - but
 * built generically so another CTA can open the same component later.
 *
 * Step 1 asks which of the site's 4 live nav categories (Weight Loss /
 * Sexual Health / Hair / Wellness - matches SiteHeader.tsx's dropdowns, see
 * docs/features/treatment-pages.md) the visitor wants. Step 2 asks
 * which product within that category, then routes straight to that
 * product's existing Bask questionnaire via resolveCta() - no intermediate
 * page. A category resolves straight from step 1, skipping step 2, only when
 * every product it lists shares one questionnaire already (Weight Loss,
 * today, via `directCtaId` - see `autoAdvanceCtaId` below), or when a
 * category has exactly one live product. Both are per-category, not
 * hardcoded, so each stops applying the moment that category's products
 * actually diverge.
 *
 * Hair additionally gates on sex first (`sexGate`, since 2026-09-04). Through
 * 2026-09-09 this was a "not yet, but soon" placeholder - Male auto-resolved
 * to the only live product (Oral Finasteride), Female dead-ended with a
 * message since there was no live women's product yet. Now that Oral
 * Minoxidil and both sexes' Hair Loss Spray are live, selecting a sex
 * instead filters `products` down to that sex's subset (via each product's
 * own `sex` tag) and advances to the normal step-2 product picker with just
 * those matching products. Every Hair product carries a `sex` tag today -
 * even Oral Minoxidil, which is one product/price/questionnaire for both
 * sexes, gets a male-tagged and a female-tagged entry (matching its 2
 * separate landing pages) rather than one untagged entry shown to both, so
 * this list never implies one sex's product to the other (Matt, 2026-09-09).
 *
 * Sexual Health's "ED Mints" entry isn't a single Bask URL - it's 2
 * formulations picked on /ed-mints today via `EdMintsPickerModal`. Rather
 * than re-implement that choice, selecting "ED Mints" here closes this
 * modal's step-2 view and opens the exact same `EdMintsPickerModal`
 * component (imported from EdMintsPicker.tsx, not duplicated), with its own
 * "Back" wired to return here to Sexual Health's product step rather than
 * just closing (see `EdMintsPickerModal`'s `onBack` prop and
 * `backFromEdMints` below).
 */

export type GetStartedProduct = (
  | { kind: "cta"; label: string; ctaId: CtaId }
  | { kind: "ed-mints"; label: string }
) & {
  /**
   * Only meaningful on a `sexGate` category - filters which products show
   * after Male/Female is selected. Omit only for a product genuinely
   * without separate men's/women's pages; a product sold as one SKU for
   * both sexes (e.g. Oral Minoxidil) still gets one male-tagged and one
   * female-tagged entry if it has separate single-sex landing pages, so
   * this list matches what each page's own copy says.
   */
  sex?: "male" | "female";
};

export type GetStartedCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  products: GetStartedProduct[];
  /**
   * When set, selecting this category resolves straight to this CtaId's
   * Bask questionnaire instead of advancing to step 2 - use when every
   * product listed under `products` already lands on the same
   * questionnaire, so making the visitor pick one first is pointless
   * friction. `products` stays populated either way (documents what's in
   * the category, and step 2 is ready to show the moment this is removed).
   * Ignored when `sexGate` is set (sexGate takes precedence).
   */
  directCtaId?: CtaId;
  /**
   * When true, selecting this category shows a Male/Female step before
   * step 2 instead of `directCtaId` or the single-product shortcut.
   * Selecting a sex filters `products` down to the matching subset (see
   * `GetStartedProduct.sex`) and proceeds straight to step 2 with just
   * those products.
   */
  sexGate?: boolean;
};

export const GET_STARTED_CATEGORIES: GetStartedCategory[] = [
  {
    id: "weight-loss",
    label: "Weight Loss",
    icon: Scale,
    // Tirzepatide and semaglutide both resolve to the same Bask weight-loss
    // questionnaire today (2026-09-04, see the money-page architecture note
    // in docs/features/treatment-pages.md - neither has its own
    // CTA_OVERRIDES entry, so both fall through to DEFAULT_CTA_TARGET).
    // Asking which one first is pointless friction, so this skips step 2
    // via weight_loss_hero - a category-level CtaId already defined in
    // cta-ids.ts for exactly this, kept separate from either product's own
    // id so attribution doesn't misreport "tirzepatide" for a visitor who
    // never actually chose it. If tirzepatide/semaglutide ever get distinct
    // questionnaires, delete directCtaId below and step 2 starts showing
    // automatically.
    directCtaId: CTA_IDS.weight_loss_hero,
    products: [
      {
        kind: "cta",
        label: "Compounded Tirzepatide",
        ctaId: CTA_IDS.tirzepatide_hero,
      },
      {
        kind: "cta",
        label: "Compounded Semaglutide",
        ctaId: CTA_IDS.semaglutide_hero,
      },
    ],
  },
  {
    id: "sexual-health",
    label: "Sexual Health",
    icon: HeartPulse,
    products: [
      { kind: "cta", label: "Tadalafil", ctaId: CTA_IDS.tadalafil_hero },
      { kind: "cta", label: "Sildenafil", ctaId: CTA_IDS.sildenafil_hero },
      { kind: "ed-mints", label: "ED Mints" },
    ],
  },
  {
    id: "hair",
    label: "Hair Loss",
    icon: Sparkles,
    // 5 live products (2026-09-09), gated by sex first (see `sexGate`
    // above). Oral Minoxidil is one product/price/questionnaire for both
    // sexes but still gets its own male-tagged and female-tagged entry here
    // (matching its 2 separate landing pages, /oral-minoxidil-men and
    // /oral-minoxidil-women) rather than one untagged entry shown to both -
    // so this step's product list, like each page's own copy, never implies
    // the other sex's product.
    sexGate: true,
    products: [
      {
        kind: "cta",
        label: "Oral Finasteride",
        ctaId: CTA_IDS.oral_finasteride_hero,
        sex: "male",
      },
      {
        kind: "cta",
        label: "Oral Minoxidil",
        ctaId: CTA_IDS.oral_minoxidil_men_hero,
        sex: "male",
      },
      {
        kind: "cta",
        label: "Oral Minoxidil",
        ctaId: CTA_IDS.oral_minoxidil_women_hero,
        sex: "female",
      },
      {
        kind: "cta",
        label: "Hair Loss Spray",
        ctaId: CTA_IDS.hairloss_spray_men_hero,
        sex: "male",
      },
      {
        kind: "cta",
        label: "Hair Loss Spray",
        ctaId: CTA_IDS.hairloss_spray_women_hero,
        sex: "female",
      },
    ],
  },
  {
    // Wellness relaunched 2026-09-16 with NAD+ as a single live product (the
    // single-product shortcut in autoAdvanceCtaId() below skipped step 2
    // automatically then). Sermorelin joined 2026-09-17, so this category
    // now shows step 2 like Sexual Health - no shared questionnaire to
    // shortcut to, and no directCtaId set.
    id: "wellness",
    label: "Wellness",
    icon: Zap,
    products: [
      { kind: "cta", label: "NAD+", ctaId: CTA_IDS.nad_hero },
      { kind: "cta", label: "Sermorelin", ctaId: CTA_IDS.sermorelin_hero },
    ],
  },
];

/**
 * The CtaId to resolve straight to when a category is selected, skipping
 * step 2 - either because `directCtaId` says every product already shares
 * one questionnaire, or because there's only one live product to begin
 * with. `sexGate` always takes precedence (it needs its own Male/Female
 * step first). Returns null when step 2 - or the sex gate - should show
 * instead.
 */
export function autoAdvanceCtaId(category: GetStartedCategory): CtaId | null {
  if (category.sexGate) return null;
  if (category.directCtaId) return category.directCtaId;
  if (category.products.length === 1) {
    const only = category.products[0];
    if (only.kind === "cta") return only.ctaId;
  }
  return null;
}

const cardClassName =
  "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-border p-6 text-center text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:border-primary/40 focus-visible:bg-accent";

type Step = "category" | "sex" | "product";
type Sex = "male" | "female";

const SEX_LABEL: Record<Sex, string> = { male: "Male", female: "Female" };

export function GetStartedModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("category");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [edMintsOpen, setEdMintsOpen] = useState(false);
  // Set right before re-opening this modal from EdMintsPickerModal's Back
  // button, so the reset-on-open effect below leaves step/categoryId alone
  // instead of snapping back to step 1 - see backFromEdMints.
  const skipResetOnOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (skipResetOnOpenRef.current) {
      skipResetOnOpenRef.current = false;
      return;
    }
    setStep("category");
    setCategoryId(null);
    setSex(null);
  }, [open]);

  const activeCategory = GET_STARTED_CATEGORIES.find(
    (c) => c.id === categoryId,
  );

  // On a sexGate category, step 2 shows only the selected sex's products
  // (plus any product with no `sex` tag, shared by both) - see
  // GetStartedProduct.sex.
  const visibleProducts =
    activeCategory?.sexGate && sex
      ? activeCategory.products.filter((p) => !p.sex || p.sex === sex)
      : (activeCategory?.products ?? []);

  function selectCategory(category: GetStartedCategory) {
    if (autoAdvanceCtaId(category)) return; // rendered as a direct Link below, not clickable via JS
    setCategoryId(category.id);
    setSex(null);
    setStep(category.sexGate ? "sex" : "product");
  }

  function selectSex(value: Sex) {
    setSex(value);
    setStep("product");
  }

  function backToCategory() {
    setStep("category");
    setCategoryId(null);
    setSex(null);
  }

  function backFromProduct() {
    if (activeCategory?.sexGate) {
      setStep("sex");
      return;
    }
    backToCategory();
  }

  function selectEdMints() {
    onOpenChange(false);
    setEdMintsOpen(true);
  }

  function backFromEdMints() {
    setEdMintsOpen(false);
    skipResetOnOpenRef.current = true;
    onOpenChange(true); // step/categoryId are still "product"/"sexual-health"
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <FullScreenMobileDialogContent>
          {step === "category" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl sm:text-3xl">
                  What are you looking for?
                </DialogTitle>
                <DialogDescription className="text-center">
                  Choose a category to get started.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {GET_STARTED_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const autoCtaId = autoAdvanceCtaId(category);

                  if (autoCtaId) {
                    const cta = resolveCta(autoCtaId);
                    return (
                      <Link
                        key={category.id}
                        to={cta.to}
                        search={cta.search}
                        onClick={cta.onClick}
                        className={cardClassName}
                      >
                        <Icon
                          className="size-8 text-accent-foreground"
                          aria-hidden
                        />
                        {category.label}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => selectCategory(category)}
                      className={cardClassName}
                    >
                      <Icon
                        className="size-8 text-accent-foreground"
                        aria-hidden
                      />
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : step === "sex" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl sm:text-3xl">
                  Who is this for?
                </DialogTitle>
                <DialogDescription className="text-center">
                  Choose the option that fits you best.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                {(["male", "female"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectSex(value)}
                    className={cardClassName}
                  >
                    {SEX_LABEL[value]}
                  </button>
                ))}
              </div>

              <DialogFooter className="sm:justify-center">
                <Button type="button" variant="ghost" onClick={backToCategory}>
                  <ArrowLeft /> Back
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl sm:text-3xl">
                  Choose your treatment
                </DialogTitle>
                <DialogDescription className="text-center">
                  Select a {activeCategory?.label.toLowerCase()} treatment to
                  continue to your questionnaire.
                </DialogDescription>
              </DialogHeader>

              <div
                className={cn(
                  "grid gap-4",
                  visibleProducts.length > 1
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-1",
                )}
              >
                {visibleProducts.map((product) => {
                  if (product.kind === "ed-mints") {
                    return (
                      <button
                        key="ed-mints"
                        type="button"
                        onClick={selectEdMints}
                        className={cardClassName}
                      >
                        {product.label}
                      </button>
                    );
                  }

                  const cta = resolveCta(product.ctaId);
                  return (
                    <Link
                      key={product.ctaId}
                      to={cta.to}
                      search={cta.search}
                      onClick={cta.onClick}
                      className={cardClassName}
                    >
                      {product.label}
                    </Link>
                  );
                })}
              </div>

              <DialogFooter className="sm:justify-center">
                <Button type="button" variant="ghost" onClick={backFromProduct}>
                  <ArrowLeft /> Back
                </Button>
              </DialogFooter>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Completing intake does not guarantee a prescription.
          </p>
        </FullScreenMobileDialogContent>
      </Dialog>

      <EdMintsPickerModal
        open={edMintsOpen}
        onOpenChange={setEdMintsOpen}
        initialSelected="rdt"
        onBack={backFromEdMints}
      />
    </>
  );
}

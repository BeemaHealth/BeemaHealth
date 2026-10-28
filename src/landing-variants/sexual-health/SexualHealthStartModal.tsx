import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FullScreenMobileDialogContent } from "@/components/site/FullScreenMobileDialog";
import { EdMintsPickerModal } from "@/components/site/EdMintsPicker";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PER_PILL_USD,
  ED_TADALAFIL_PER_PILL_USD,
  formatPerPillStartingAt,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import tadalafilPhoto from "@/assets/treatments/tadalafil-oral-tablets-bottle.webp";
import sildenafilPhoto from "@/assets/treatments/sildenafil-oral-tablets-bottle.webp";
import edMintsPhoto from "@/assets/treatments/ed-mints-dissolvable-tablet.webp";

const cardClassName =
  "flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-border p-4 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:border-primary/40 focus-visible:bg-accent sm:flex-col sm:gap-3 sm:p-6 sm:text-center";

const OPTIONS = {
  tadalafil: {
    name: "Tadalafil",
    price: `from ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}`,
    photo: tadalafilPhoto,
    width: 720,
    height: 900,
  },
  sildenafil: {
    name: "Sildenafil",
    price: `from ${formatPerPillStartingAt(ED_SILDENAFIL_PER_PILL_USD)}`,
    photo: sildenafilPhoto,
    width: 720,
    height: 900,
  },
  edMints: {
    name: "ED Mints",
    price: formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING),
    photo: edMintsPhoto,
    width: 1024,
    height: 1024,
  },
} as const;

function OptionBody({
  option,
}: {
  option: (typeof OPTIONS)[keyof typeof OPTIONS];
}) {
  return (
    <>
      <img
        src={option.photo}
        alt=""
        width={option.width}
        height={option.height}
        loading="lazy"
        decoding="async"
        className="h-16 w-14 shrink-0 object-contain sm:h-24 sm:w-auto"
      />
      <span className="flex flex-col">
        <span className="text-base font-semibold text-foreground">
          {option.name}
        </span>
        <span className="text-sm font-normal text-muted-foreground">
          {option.price}
        </span>
      </span>
    </>
  );
}

/**
 * ED Mints formulation picker with every option credited to /sexual-health/.
 * Opened from the product picker below, or directly from a product card.
 */
export function SexualHealthEdMintsPicker({
  open,
  onOpenChange,
  onBack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}) {
  return (
    <>
      <EdMintsPickerModal
        open={open}
        onOpenChange={onOpenChange}
        initialSelected="odt"
        onBack={onBack}
        ctaIds={{
          rdt: CTA_IDS.sexual_health_ed_mints_rdt,
          odt: CTA_IDS.sexual_health_ed_mints_odt,
        }}
      />
    </>
  );
}

/**
 * Sexual Health "Get Started" product picker (CRO variant). Tadalafil and
 * Sildenafil go straight to their own questionnaires; ED Mints opens the same
 * formulation picker the ED Mints page uses. Every option carries a
 * sexual_health_ CTA id so the handoff, signup and purchase are credited to
 * /sexual-health/, not to the product page.
 */
export function SexualHealthStartModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [edMintsOpen, setEdMintsOpen] = useState(false);
  const tadalafil = resolveCta(CTA_IDS.sexual_health_tadalafil);
  const sildenafil = resolveCta(CTA_IDS.sexual_health_sildenafil);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <FullScreenMobileDialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl sm:text-3xl">
              Choose your treatment
            </DialogTitle>
            <DialogDescription className="text-center">
              Select a treatment to continue to your questionnaire.
            </DialogDescription>
          </DialogHeader>

          <div className="grid flex-1 auto-rows-fr gap-3 sm:flex-none sm:grid-cols-3 sm:gap-4">
            <Link
              to={tadalafil.to}
              search={tadalafil.search}
              onClick={tadalafil.onClick}
              className={cardClassName}
            >
              <OptionBody option={OPTIONS.tadalafil} />
            </Link>
            <Link
              to={sildenafil.to}
              search={sildenafil.search}
              onClick={sildenafil.onClick}
              className={cardClassName}
            >
              <OptionBody option={OPTIONS.sildenafil} />
            </Link>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setEdMintsOpen(true);
              }}
              className={cardClassName}
            >
              <OptionBody option={OPTIONS.edMints} />
            </button>
          </div>

          <DialogFooter className="sm:justify-center">
            <p className="text-center text-xs text-muted-foreground">
              Completing intake does not guarantee a prescription.
            </p>
          </DialogFooter>
        </FullScreenMobileDialogContent>
      </Dialog>

      <SexualHealthEdMintsPicker
        open={edMintsOpen}
        onOpenChange={setEdMintsOpen}
        onBack={() => {
          setEdMintsOpen(false);
          onOpenChange(true);
        }}
      />
    </>
  );
}

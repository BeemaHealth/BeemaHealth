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

const cardClassName =
  "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-border p-6 text-center text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:border-primary/40 focus-visible:bg-accent";

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

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to={tadalafil.to}
              search={tadalafil.search}
              onClick={tadalafil.onClick}
              className={cardClassName}
            >
              Tadalafil
            </Link>
            <Link
              to={sildenafil.to}
              search={sildenafil.search}
              onClick={sildenafil.onClick}
              className={cardClassName}
            >
              Sildenafil
            </Link>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setEdMintsOpen(true);
              }}
              className={cardClassName}
            >
              ED Mints
            </button>
          </div>

          <DialogFooter className="sm:justify-center">
            <p className="text-center text-xs text-muted-foreground">
              Completing intake does not guarantee a prescription.
            </p>
          </DialogFooter>
        </FullScreenMobileDialogContent>
      </Dialog>

      <EdMintsPickerModal
        open={edMintsOpen}
        onOpenChange={setEdMintsOpen}
        initialSelected="odt"
        onBack={() => {
          setEdMintsOpen(false);
          onOpenChange(true);
        }}
        ctaIds={{
          rdt: CTA_IDS.sexual_health_ed_mints_rdt,
          odt: CTA_IDS.sexual_health_ed_mints_odt,
        }}
      />
    </>
  );
}

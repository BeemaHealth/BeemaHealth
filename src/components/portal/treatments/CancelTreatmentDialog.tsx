import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Treatment } from "@/lib/api/portal/treatments";
import { InlineError } from "../PortalStates";
import { NO_CANCEL_POLICY } from "./treatment-model";

export function CancelTreatmentDialog({
  treatment,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  treatment: Treatment | null;
  pending: boolean;
  error: string | null;
  onConfirm: (treatment: Treatment) => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={!!treatment}
      onOpenChange={(open) => !open && !pending && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Cancel {treatment?.product_name ?? "treatment"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your visit has not been submitted yet, so you can cancel now and be
            refunded in full. {NO_CANCEL_POLICY}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <InlineError message={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            Keep treatment
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !treatment}
            onClick={() => treatment && onConfirm(treatment)}
          >
            {pending ? "Canceling" : "Cancel treatment"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

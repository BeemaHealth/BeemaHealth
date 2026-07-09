import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccountSectionCard,
  accountSectionDividerClass,
} from "@/components/portal/AccountSectionCard";
import { changePaymentCard } from "@/lib/api/client";
import { StripeConfirmForm } from "@/components/payments/StripeConfirmForm";
import type {
  AuthorizationHold,
  StripePaymentMethodSummary,
} from "@/lib/types/mvp";
import { cn } from "@/lib/utils";

const HOLD_STATUS_LABEL: Record<AuthorizationHold["status"], string> = {
  created: "Starting…",
  processing: "Processing…",
  held: "Hold placed",
  requires_action: "Verification needed",
  captured: "Captured",
  failed: "Payment failed",
  canceled: "Canceled",
  expired: "Expired",
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Account settings "Payment" section — saved card, active hold status, update card. */
export function PaymentMethodSection({
  paymentMethods,
  activeHold,
  onCardUpdated,
}: {
  paymentMethods: StripePaymentMethodSummary[];
  activeHold: AuthorizationHold | null;
  onCardUpdated: (hold: AuthorizationHold) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [updateHold, setUpdateHold] = useState<AuthorizationHold | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultMethod =
    paymentMethods.find((m) => m.is_default) ?? paymentMethods[0];
  const canRemove =
    !activeHold ||
    activeHold.status === "canceled" ||
    activeHold.status === "expired";

  const handleUpdateCard = async () => {
    setError(null);
    setUpdating(true);
    try {
      const hold = await changePaymentCard();
      setUpdateHold(hold);
    } catch {
      setError("Unable to update your card right now. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AccountSectionCard
      title="Payment"
      description="Card on file for treatment payments"
      icon={CreditCard}
      tone="payment"
    >
      <div className={cn("divide-y", accountSectionDividerClass("payment"))}>
        {defaultMethod ? (
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {defaultMethod.card_brand.toUpperCase()} ••••{" "}
                {defaultMethod.card_last4}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {defaultMethod.card_exp_month}/
                {defaultMethod.card_exp_year}
              </p>
            </div>
            {activeHold ? (
              <span className="text-xs font-medium text-muted-foreground">
                {HOLD_STATUS_LABEL[activeHold.status]}
                {activeHold.amount_cents
                  ? ` — ${formatAmount(activeHold.amount_cents)}`
                  : ""}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            No payment method on file yet.
          </p>
        )}

        {updateHold?.client_secret ? (
          <div className="py-3">
            <StripeConfirmForm
              clientSecret={updateHold.client_secret}
              onConfirmed={() => {
                onCardUpdated(updateHold);
                setUpdateHold(null);
              }}
              onDeclined={(message) => setError(message)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3">
            <Button
              type="button"
              variant="outline"
              disabled={updating}
              onClick={() => void handleUpdateCard()}
            >
              {defaultMethod ? "Update card" : "Add card"}
            </Button>
            <Button type="button" variant="ghost" disabled={!canRemove}>
              Remove card
            </Button>
          </div>
        )}

        {error ? (
          <p className="pb-3 text-sm text-destructive">{error}</p>
        ) : null}
        {!canRemove ? (
          <p className="pb-3 text-xs text-muted-foreground">
            Your card can't be removed while a payment hold is active.
          </p>
        ) : null}
      </div>
    </AccountSectionCard>
  );
}

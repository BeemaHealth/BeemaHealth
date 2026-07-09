import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
);

const DECLINE_MESSAGES: Record<string, string> = {
  insufficient_funds:
    "Your card was declined due to insufficient funds. Please use a different card.",
  card_declined:
    "Your card was declined. Please use a different card or contact your bank.",
  expired_card: "Your card has expired. Please update your payment method.",
  authentication_required:
    "Your bank requires you to verify this payment. Please log in to complete it.",
};

export function patientSafeErrorMessage(code: string | undefined): string {
  if (code && DECLINE_MESSAGES[code]) return DECLINE_MESSAGES[code];
  return "Your card was declined. Please try a different card.";
}

/** Stripe Payment Element confirm form — used by the questionnaire payment
 * field and the account settings "update card" flow. Always calls
 * confirmPayment with redirect: "if_required" so 3DS resolves in-place. */
export function StripeConfirmForm({
  clientSecret,
  onConfirmed,
  onDeclined,
  helperText,
}: {
  clientSecret: string;
  onConfirmed: () => void;
  onDeclined: (message: string) => void;
  helperText?: string;
}) {
  const options = useMemo(() => ({ clientSecret }), [clientSecret]);
  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentConfirmInner
        onConfirmed={onConfirmed}
        onDeclined={onDeclined}
        helperText={helperText}
      />
    </Elements>
  );
}

function PaymentConfirmInner({
  onConfirmed,
  onDeclined,
  helperText,
}: {
  onConfirmed: () => void;
  onDeclined: (message: string) => void;
  helperText?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setSubmitting(false);
    if (error) {
      onDeclined(patientSafeErrorMessage(error.decline_code || error.code));
      return;
    }
    onConfirmed();
  };

  return (
    <div className="space-y-4">
      {helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
      <PaymentElement />
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "Confirming…" : "Confirm payment method"}
      </Button>
    </div>
  );
}

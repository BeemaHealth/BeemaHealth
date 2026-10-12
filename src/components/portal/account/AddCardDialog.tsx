import {
  PaymentElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSetupIntent } from "@/lib/api/portal/billing";
import { ErrorState, InlineError, LoadingBlock } from "../PortalStates";
import { accountKeys } from "../query-keys";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  const key = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY as
    | string
    | undefined;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

function CardForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const confirm = useMutation({
    mutationFn: async () => {
      if (!stripe || !elements) throw new Error("not ready");
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (result.error)
        throw new Error(result.error.message || "We could not save that card.");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountKeys.methods });
      onDone();
    },
    onError: (e) =>
      setError(
        e instanceof Error && e.message !== "not ready"
          ? e.message
          : "We could not save that card. Please try again.",
      ),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        confirm.mutate();
      }}
      className="grid gap-4"
    >
      <PaymentElement />
      <InlineError message={error} />
      <Button type="submit" disabled={!stripe || confirm.isPending}>
        {confirm.isPending ? "Saving" : "Save card"}
      </Button>
    </form>
  );
}

export function AddCardDialog({ onClose }: { onClose: () => void }) {
  const stripe = useMemo(() => getStripe(), []);
  const intent = useQuery({
    queryKey: ["portal", "account", "setup-intent"],
    queryFn: createSetupIntent,
    enabled: !!stripe,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            Your card details go straight to our payment processor. We never see
            or store them.
          </DialogDescription>
        </DialogHeader>
        {!stripe ? (
          <ErrorState
            title="Cards are unavailable"
            error={new Error("Card entry is not configured.")}
          />
        ) : intent.isPending ? (
          <LoadingBlock rows={1} label="Preparing secure card form" />
        ) : intent.isError ? (
          <ErrorState
            title="Could not start card entry"
            error={intent.error}
            onRetry={() => void intent.refetch()}
          />
        ) : (
          <Elements stripe={stripe} options={{ clientSecret: intent.data }}>
            <CardForm onDone={onClose} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

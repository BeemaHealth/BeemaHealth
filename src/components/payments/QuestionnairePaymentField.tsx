import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  changePaymentCard,
  createPaymentHold,
  fetchPaymentHold,
  ApiError,
} from "@/lib/api/client";
import {
  StripeConfirmForm,
  patientSafeErrorMessage,
} from "@/components/payments/StripeConfirmForm";
import type { AuthorizationHold } from "@/lib/types/mvp";

export type PaymentFieldValue = {
  payment_status: AuthorizationHold["status"] | "not_started";
} | null;

type QuestionnairePaymentFieldProps = {
  value: unknown;
  onChange: (value: PaymentFieldValue) => void;
  readOnly?: boolean;
};

const HELD_STATUSES: ReadonlyArray<AuthorizationHold["status"]> = [
  "held",
  "captured",
];

const TERMINAL_STATUSES: ReadonlyArray<AuthorizationHold["status"]> = [
  "held",
  "captured",
  "failed",
  "canceled",
  "expired",
];

function statusFromValue(
  value: unknown,
): AuthorizationHold["status"] | "not_started" {
  if (
    value &&
    typeof value === "object" &&
    "payment_status" in value &&
    typeof (value as { payment_status: unknown }).payment_status === "string"
  ) {
    return (value as { payment_status: AuthorizationHold["status"] })
      .payment_status;
  }
  return "not_started";
}

/** Payment step gate for the dynamic questionnaire — auth-hold or setup-only card
 * collection via Stripe Payment Element. Unlocks only once the backend (via
 * webhook) confirms the hold, not merely on the client-side confirm result. */
export function QuestionnairePaymentField({
  value,
  onChange,
  readOnly = false,
}: QuestionnairePaymentFieldProps) {
  const status = statusFromValue(value);

  if (readOnly) {
    return (
      <p className="text-sm text-muted-foreground">
        {HELD_STATUSES.includes(status as AuthorizationHold["status"])
          ? "Payment authorized."
          : "Payment not yet completed."}
      </p>
    );
  }

  return (
    <PaymentFieldInner
      status={status}
      onStatusChange={(next) => onChange({ payment_status: next })}
    />
  );
}

function PaymentFieldInner({
  status,
  onStatusChange,
}: {
  status: AuthorizationHold["status"] | "not_started";
  onStatusChange: (status: AuthorizationHold["status"]) => void;
}) {
  const [hold, setHold] = useState<AuthorizationHold | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await fetchPaymentHold();
        if (cancelled) return;
        if (existing) {
          setHold(existing);
          onStatusChange(existing.status);
        }
      } catch {
        if (!cancelled)
          setLoadError("Unable to check your payment status. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only check; onStatusChange is a fresh inline function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startHold = async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const created = await createPaymentHold();
      setHold(created);
      onStatusChange(created.status);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setLoadError(
          "Payment isn't available at this step yet. Please refresh and try again.",
        );
      } else if (err instanceof ApiError && err.status === 503) {
        setLoadError(
          "Payments aren't enabled right now. Please try again later.",
        );
      } else {
        setLoadError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && hold === null && !loadError) {
      void startHold();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hold, loadError]);

  const pollUntilResolved = async () => {
    setVerifying(true);
    onStatusChange("processing");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const latest = await fetchPaymentHold();
        if (latest) {
          setHold(latest);
          onStatusChange(latest.status);
          if (TERMINAL_STATUSES.includes(latest.status)) {
            setVerifying(false);
            if (latest.status === "failed") {
              setLoadError(patientSafeErrorMessage(latest.status_reason));
            }
            return;
          }
        }
      } catch {
        // transient network error — keep polling until attempts are exhausted
      }
    }
    setVerifying(false);
    setLoadError(
      "We're still verifying your payment — this can take a moment. Refresh to check again.",
    );
  };

  const handleChangeCard = async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const replaced = await changePaymentCard();
      setHold(replaced);
      onStatusChange(replaced.status);
    } catch {
      setLoadError("Unable to update your card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (HELD_STATUSES.includes(status as AuthorizationHold["status"])) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4">
        <p className="text-sm text-foreground">
          Card on file — payment authorized.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => void handleChangeCard()}
          disabled={loading}
        >
          Use a different card
        </Button>
        {loadError ? (
          <p className="mt-2 text-sm text-destructive">{loadError}</p>
        ) : null}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => void startHold()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (verifying) {
    return (
      <p className="text-sm text-muted-foreground">Verifying your payment…</p>
    );
  }

  if (loading || !hold?.client_secret) {
    return (
      <p className="text-sm text-muted-foreground">Loading payment form…</p>
    );
  }

  return (
    <StripeConfirmForm
      clientSecret={hold.client_secret}
      onConfirmed={() => void pollUntilResolved()}
      onDeclined={(message) => setLoadError(message)}
      helperText="We place a temporary hold on your card — not a charge. It's released or captured once your provider completes review."
    />
  );
}

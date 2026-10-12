import {
  AlertTriangle,
  CreditCard,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Subscription } from "@/lib/api/portal/billing";
import type { NextShipment, Treatment } from "@/lib/api/portal/treatments";
import { NOTICE_BANNER_STYLES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../StatusBadge";
import { formatDate } from "../portal-format";
import {
  AUTO_RENEW_POLICY,
  NO_CANCEL_POLICY,
  canToggleAutoRenew,
  cardState,
  doseLine,
  nextPaymentText,
  nextShipmentText,
  shipsEveryLabel,
  statusTone,
} from "./treatment-model";
import type { ActionItem } from "@/lib/api/portal/treatments";

export interface TreatmentPlanCardProps {
  treatment: Treatment;
  subscription: Subscription | null;
  shipment: NextShipment | null;
  items: ActionItem[];
  index?: number;
  autoRenewPending?: boolean;
  refillPending?: boolean;
  actionError?: string | null;
  onFixPayment: () => void;
  onAction: (item: ActionItem | null) => void;
  onCancel: (treatment: Treatment) => void;
  onToggleAutoRenew: (subscription: Subscription, enabled: boolean) => void;
  onRefill: (treatment: Treatment) => void;
}

const fmt = (v: string | null) => formatDate(v);

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** One treatment: dose and cadence, next shipment and next payment are three separate things. */
export function TreatmentPlanCard({
  treatment,
  subscription,
  shipment,
  items,
  index = 0,
  autoRenewPending,
  refillPending,
  actionError,
  onFixPayment,
  onAction,
  onCancel,
  onToggleAutoRenew,
  onRefill,
}: TreatmentPlanCardProps) {
  const reduce = useReducedMotion();
  const state = cardState(treatment, items, subscription);
  const dose = doseLine(treatment);
  const toggle = canToggleAutoRenew(subscription) ? subscription : null;
  const switchId = `auto-renew-${treatment.id}`;
  const heading = `treatment-${treatment.id}`;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduce ? 0 : 0.06 * index,
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="list-none"
    >
      <article
        aria-labelledby={heading}
        className={cn(
          "flex h-full flex-col gap-4 rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift",
          state.kind === "payment_error"
            ? "border-destructive/50"
            : state.kind === "action_required"
              ? "border-warning/50"
              : "border-border",
        )}
      >
        <header className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
          <span>{treatment.plan_name || "Treatment"}</span>
          <span>{shipsEveryLabel(subscription)}</span>
        </header>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={heading} className="font-display text-xl font-semibold">
              {treatment.product_name}
            </h3>
            {dose && <p className="text-sm text-foreground/80">{dose}</p>}
          </div>
          <StatusBadge
            label={treatment.status_label}
            tone={statusTone(treatment.status)}
          />
        </div>

        {state.kind === "payment_error" && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="flex items-start gap-2 text-sm font-medium">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              {state.item?.title || "We could not process your last payment."}
            </p>
            <p className="text-sm text-muted-foreground">
              {state.item?.body ||
                "Update your card so your treatment is not interrupted."}
            </p>
            <Button
              type="button"
              size="sm"
              className="self-start"
              onClick={onFixPayment}
            >
              Update payment method
            </Button>
          </div>
        )}

        {state.kind === "action_required" && (
          <div
            role="alert"
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-4",
              NOTICE_BANNER_STYLES.warning,
            )}
          >
            <p className="flex items-start gap-2 text-sm font-medium">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-warning-foreground"
                aria-hidden="true"
              />
              {state.item?.title || "Action required"}
            </p>
            {state.item?.body && (
              <p className="text-sm text-muted-foreground">{state.item.body}</p>
            )}
            <Button
              type="button"
              size="sm"
              className="self-start"
              onClick={() => onAction(state.item)}
            >
              Take action
            </Button>
          </div>
        )}

        <dl className="grid gap-2">
          <Row
            icon={Package}
            label="Dose:"
            value={dose || "Pending doctor review"}
          />
          <Row
            icon={Truck}
            label="Next shipment:"
            value={nextShipmentText(shipment, subscription, fmt)}
          />
          <Row
            icon={CreditCard}
            label="Next payment:"
            value={nextPaymentText(subscription, fmt)}
          />
        </dl>

        {toggle && (
          <div className="rounded-2xl bg-muted/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={switchId} className="text-sm font-medium">
                Auto-renew at end of term
              </label>
              <Switch
                id={switchId}
                checked={toggle.renews_at_term_end}
                disabled={autoRenewPending}
                onCheckedChange={(v) => onToggleAutoRenew(toggle, v)}
                aria-describedby={`${switchId}-policy`}
              />
            </div>
            <p
              id={`${switchId}-policy`}
              className="mt-2 text-xs text-muted-foreground"
            >
              {AUTO_RENEW_POLICY}
            </p>
          </div>
        )}

        {actionError && (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        )}

        {(treatment.can_cancel || treatment.status === "refill_due") && (
          <footer className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              {treatment.status === "refill_due" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={refillPending}
                  onClick={() => onRefill(treatment)}
                >
                  <RefreshCw aria-hidden="true" />
                  {refillPending ? "Requesting" : "Request refill"}
                </Button>
              )}
              {treatment.can_cancel && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel(treatment)}
                >
                  Cancel treatment
                </Button>
              )}
            </div>
            {treatment.can_cancel && (
              <p className="text-xs text-muted-foreground">
                {NO_CANCEL_POLICY}
              </p>
            )}
          </footer>
        )}
      </article>
    </motion.li>
  );
}

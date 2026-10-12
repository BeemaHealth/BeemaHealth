import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, MapPin, Plus, Receipt, Repeat } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  deleteAddress,
  listAddresses,
  type Address,
} from "@/lib/api/portal/account";
import {
  listInvoices,
  listPaymentMethods,
  listSubscriptions,
  setAutoRenew,
  setDefaultPaymentMethod,
  type Subscription,
} from "@/lib/api/portal/billing";
import { AccountSectionCard } from "../AccountSectionCard";
import {
  EmptyState,
  ErrorState,
  InlineError,
  LoadingBlock,
} from "../PortalStates";
import { errorMessage } from "../portal-errors";
import { StatusBadge } from "../StatusBadge";
import { formatDate, formatMoney } from "../portal-format";
import {
  AUTO_RENEW_POLICY,
  canToggleAutoRenew,
} from "../treatments/treatment-model";
import { AddCardDialog } from "./AddCardDialog";
import { AddressDialog } from "./AddressDialog";
import { accountKeys } from "../query-keys";
import {
  brandLabel,
  cardExpiry,
  formatAddress,
  invoiceLabel,
  invoiceTone,
  isCardExpired,
} from "./account-model";

function Subscriptions() {
  const qc = useQueryClient();
  const subs = useQuery({
    queryKey: ["portal", "subscriptions"],
    queryFn: listSubscriptions,
  });
  const toggle = useMutation({
    mutationFn: (v: { sub: Subscription; enabled: boolean }) =>
      setAutoRenew(v.sub.id, v.enabled),
    onSuccess: (updated) =>
      qc.setQueryData<Subscription[]>(["portal", "subscriptions"], (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)),
      ),
  });

  return (
    <AccountSectionCard
      title="Subscriptions"
      description="Your plans and renewals"
      icon={Repeat}
      tone="refills"
    >
      {subs.isPending ? (
        <LoadingBlock rows={1} label="Loading subscriptions" />
      ) : subs.isError ? (
        <ErrorState error={subs.error} onRetry={() => void subs.refetch()} />
      ) : subs.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
      ) : (
        <ul className="grid gap-4">
          {subs.data.map((s) => (
            <li
              key={s.id}
              className="grid gap-2 rounded-2xl border border-border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{s.plan_name}</p>
                <StatusBadge
                  label={s.status.replace("_", " ")}
                  tone={
                    s.status === "active"
                      ? "success"
                      : s.status === "past_due"
                        ? "warning"
                        : "muted"
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {s.commitment === "prepaid_term"
                  ? `Prepaid through ${formatDate(s.paid_through, "term end")}`
                  : `Next bill ${formatDate(s.next_bill_on, "not scheduled")}`}
              </p>
              {canToggleAutoRenew(s) && (
                <div className="mt-1 rounded-xl bg-muted/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor={`renew-${s.id}`}
                      className="text-sm font-medium"
                    >
                      Auto-renew
                    </label>
                    <Switch
                      id={`renew-${s.id}`}
                      checked={s.renews_at_term_end}
                      disabled={
                        toggle.isPending && toggle.variables?.sub.id === s.id
                      }
                      onCheckedChange={(enabled) =>
                        toggle.mutate({ sub: s, enabled })
                      }
                      aria-describedby={`renew-${s.id}-policy`}
                    />
                  </div>
                  <p
                    id={`renew-${s.id}-policy`}
                    className="mt-2 text-xs text-muted-foreground"
                  >
                    {AUTO_RENEW_POLICY}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {toggle.isError && <InlineError message={errorMessage(toggle.error)} />}
    </AccountSectionCard>
  );
}

function Addresses() {
  const qc = useQueryClient();
  const addresses = useQuery({
    queryKey: accountKeys.addresses,
    queryFn: listAddresses,
  });
  const [dialog, setDialog] = useState<Address | "new" | null>(null);
  const remove = useMutation({
    mutationFn: (a: Address) => deleteAddress(a.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });

  return (
    <AccountSectionCard
      title="Shipping addresses"
      description="Where your treatment is delivered"
      icon={MapPin}
      tone="shipping"
      headerAction={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDialog("new")}
        >
          <Plus aria-hidden="true" /> Add
        </Button>
      }
    >
      {addresses.isPending ? (
        <LoadingBlock rows={1} label="Loading addresses" />
      ) : addresses.isError ? (
        <ErrorState
          error={addresses.error}
          onRetry={() => void addresses.refetch()}
        />
      ) : addresses.data.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          body="Add a shipping address so we can deliver your treatment."
        />
      ) : (
        <ul className="grid gap-3">
          {addresses.data.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-2 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium capitalize">
                  {a.kind}
                  {a.is_default && <StatusBadge label="Default" tone="info" />}
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {formatAddress(a)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog(a)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(a)}
                  aria-label={`Remove ${a.kind} address`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {remove.isError && <InlineError message={errorMessage(remove.error)} />}
      {dialog && (
        <AddressDialog address={dialog} onClose={() => setDialog(null)} />
      )}
    </AccountSectionCard>
  );
}

function PaymentMethods() {
  const qc = useQueryClient();
  const methods = useQuery({
    queryKey: accountKeys.methods,
    queryFn: listPaymentMethods,
  });
  const [adding, setAdding] = useState(false);
  const makeDefault = useMutation({
    mutationFn: (id: string) => setDefaultPaymentMethod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.methods }),
  });

  return (
    <AccountSectionCard
      title="Payment methods"
      description="Cards used for your plan"
      icon={CreditCard}
      tone="primary"
      headerAction={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
        >
          <Plus aria-hidden="true" /> Add card
        </Button>
      }
    >
      {methods.isPending ? (
        <LoadingBlock rows={1} label="Loading payment methods" />
      ) : methods.isError ? (
        <ErrorState
          error={methods.error}
          onRetry={() => void methods.refetch()}
        />
      ) : methods.data.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards saved"
          body="Add a card to keep your plan active."
        />
      ) : (
        <ul className="grid gap-3">
          {methods.data.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {brandLabel(m.brand)} ending {m.last4}
                  {m.is_default && <StatusBadge label="Default" tone="info" />}
                  {isCardExpired(m) && (
                    <StatusBadge label="Expired" tone="warning" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {cardExpiry(m)}
                </p>
              </div>
              {!m.is_default && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={makeDefault.isPending}
                  onClick={() => makeDefault.mutate(m.id)}
                >
                  Make default
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {makeDefault.isError && (
        <InlineError message={errorMessage(makeDefault.error)} />
      )}
      {adding && <AddCardDialog onClose={() => setAdding(false)} />}
    </AccountSectionCard>
  );
}

function Invoices() {
  const invoices = useQuery({
    queryKey: accountKeys.invoices,
    queryFn: listInvoices,
  });
  return (
    <AccountSectionCard
      title="Invoices"
      description="Payments and refunds"
      icon={Receipt}
      tone="orders"
    >
      {invoices.isPending ? (
        <LoadingBlock rows={1} label="Loading invoices" />
      ) : invoices.isError ? (
        <ErrorState
          error={invoices.error}
          onRetry={() => void invoices.refetch()}
        />
      ) : invoices.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {invoices.data.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {formatDate(i.paid_at ?? i.created_at)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {i.lines.map((l) => l.description).join(", ") || "Invoice"}
                </p>
                {i.refunded_cents > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Refunded {formatMoney(i.refunded_cents, i.currency)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">
                  {formatMoney(i.total_cents, i.currency)}
                </span>
                <StatusBadge
                  label={invoiceLabel(i)}
                  tone={invoiceTone(i.status)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountSectionCard>
  );
}

export function BillingTab() {
  return (
    <div className="grid gap-4">
      <Subscriptions />
      <PaymentMethods />
      <Addresses />
      <Invoices />
    </div>
  );
}

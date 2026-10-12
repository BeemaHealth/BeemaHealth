import { treatmentKeys } from "../query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Pill } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listSubscriptions,
  setAutoRenew,
  type Subscription,
} from "@/lib/api/portal/billing";
import {
  cancelTreatment,
  getNextShipment,
  listActionItems,
  listTreatments,
  requestRefill,
  type ActionItem,
  type Treatment,
  type TreatmentTab,
} from "@/lib/api/portal/treatments";
import { EmptyState, ErrorState, LoadingBlock } from "../PortalStates";
import { errorMessage } from "../portal-errors";
import { CancelTreatmentDialog } from "./CancelTreatmentDialog";
import { TreatmentPlanCard } from "./TreatmentPlanCard";
import { matchSubscription, shipmentFor } from "./treatment-model";

function TabBody({ tab }: { tab: TreatmentTab }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState<Treatment | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const treatments = useQuery({
    queryKey: treatmentKeys.list(tab),
    queryFn: () => listTreatments(tab),
  });
  // Supporting data is optional: a failure here must not hide the treatments themselves.
  const items = useQuery({
    queryKey: treatmentKeys.items,
    queryFn: listActionItems,
  });
  const subs = useQuery({
    queryKey: treatmentKeys.subs,
    queryFn: listSubscriptions,
  });
  const shipment = useQuery({
    queryKey: treatmentKeys.shipment,
    queryFn: getNextShipment,
  });

  const setErr = (id: string, msg: string | null) =>
    setCardErrors((prev) => {
      const next = { ...prev };
      if (msg) next[id] = msg;
      else delete next[id];
      return next;
    });

  const cancel = useMutation({
    mutationFn: (t: Treatment) => cancelTreatment(t.id),
    onSuccess: () => {
      setCancelTarget(null);
      void qc.invalidateQueries({ queryKey: treatmentKeys.all });
      void qc.invalidateQueries({ queryKey: treatmentKeys.items });
    },
  });

  const autoRenew = useMutation({
    mutationFn: (v: { sub: Subscription; enabled: boolean }) =>
      setAutoRenew(v.sub.id, v.enabled),
    onSuccess: (updated) => {
      qc.setQueryData<Subscription[]>(treatmentKeys.subs, (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)),
      );
    },
  });

  const refill = useMutation({
    mutationFn: (t: Treatment) => requestRefill(t.id),
    onSuccess: (_o, t) => {
      setErr(t.id, null);
      void qc.invalidateQueries({ queryKey: treatmentKeys.all });
      void qc.invalidateQueries({ queryKey: treatmentKeys.shipment });
    },
    onError: (e, t) => setErr(t.id, errorMessage(e)),
  });

  if (treatments.isPending)
    return <LoadingBlock rows={2} label="Loading treatments" />;
  if (treatments.isError)
    return (
      <ErrorState
        error={treatments.error}
        onRetry={() => void treatments.refetch()}
      />
    );

  const list = treatments.data.results;
  if (list.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title={
          tab === "active" ? "No active treatments yet" : "Nothing pending"
        }
        body={
          tab === "active"
            ? "Once your doctor approves your plan, your treatment shows up here."
            : "Treatments waiting on payment, a visit or your review appear here."
        }
      />
    );
  }

  const openItems: ActionItem[] = items.data?.results ?? [];
  const toPayment = () =>
    void navigate({
      to: "/portal/account" as "/",
      search: { tab: "billing" } as never,
    });

  return (
    <>
      <ul className="grid gap-4 lg:grid-cols-2">
        {list.map((t, i) => {
          const sub = matchSubscription(t, subs.data ?? []);
          return (
            <TreatmentPlanCard
              key={t.id}
              index={i}
              treatment={t}
              subscription={sub}
              shipment={shipmentFor(t, shipment.data ?? null)}
              items={openItems}
              autoRenewPending={
                autoRenew.isPending && autoRenew.variables?.sub.id === sub?.id
              }
              refillPending={refill.isPending && refill.variables?.id === t.id}
              actionError={cardErrors[t.id] ?? null}
              onFixPayment={toPayment}
              onAction={() => void navigate({ to: "/portal/chat" as "/" })}
              onCancel={(tr) => {
                cancel.reset();
                setCancelTarget(tr);
              }}
              onToggleAutoRenew={(s, enabled) =>
                autoRenew.mutate(
                  { sub: s, enabled },
                  {
                    onError: (e) => setErr(t.id, errorMessage(e)),
                    onSuccess: () => setErr(t.id, null),
                  },
                )
              }
              onRefill={(tr) => refill.mutate(tr)}
            />
          );
        })}
      </ul>
      <CancelTreatmentDialog
        treatment={cancelTarget}
        pending={cancel.isPending}
        error={cancel.isError ? errorMessage(cancel.error) : null}
        onConfirm={(t) => cancel.mutate(t)}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}

export function TreatmentsPanel() {
  return (
    <Tabs defaultValue="active" className="grid gap-5">
      <TabsList className="h-11 w-full rounded-full p-1">
        <TabsTrigger value="active" className="flex-1 rounded-full">
          Active
        </TabsTrigger>
        <TabsTrigger value="pending" className="flex-1 rounded-full">
          Pending
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="mt-0">
        <TabBody tab="active" />
      </TabsContent>
      <TabsContent value="pending" className="mt-0">
        <TabBody tab="pending" />
      </TabsContent>
    </Tabs>
  );
}

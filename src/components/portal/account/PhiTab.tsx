import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
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
import {
  createDataRequest,
  exportMyData,
  listDataRequests,
} from "@/lib/api/portal/account";
import { downloadJson } from "./download";
import { InlineError } from "../PortalStates";
import { errorMessage } from "../portal-errors";
import { StatusBadge } from "../StatusBadge";
import { formatDate } from "../portal-format";
import { accountKeys } from "../query-keys";
import {
  DATA_REQUEST_STATUS_LABELS,
  exportFilename,
  openDataRequest,
} from "./account-model";

export function PhiTab() {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: accountKeys.dataRequests,
    queryFn: listDataRequests,
  });
  const [confirming, setConfirming] = useState(false);

  const download = useMutation({
    mutationFn: async () => {
      const data = await exportMyData();
      downloadJson(data, exportFilename());
    },
  });

  const deletion = useMutation({
    mutationFn: () => createDataRequest("deletion"),
    onSuccess: () => {
      setConfirming(false);
      void qc.invalidateQueries({ queryKey: accountKeys.dataRequests });
    },
  });

  const open = openDataRequest(requests.data ?? [], "deletion");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section
        aria-labelledby="phi-heading"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft"
      >
        <h2
          id="phi-heading"
          className="flex items-center gap-2 font-display text-xl font-semibold"
        >
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          Protected Healthcare Information
        </h2>
        <p className="text-sm text-muted-foreground">
          You can download all your health information and past doctor
          consultations for your personal records.
        </p>
        <div className="mt-auto pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={download.isPending}
            onClick={() => download.mutate()}
          >
            <Download aria-hidden="true" />
            {download.isPending ? "Preparing" : "Download my data"}
          </Button>
        </div>
        {download.isError && (
          <InlineError message={errorMessage(download.error)} />
        )}
        {download.isSuccess && (
          <p role="status" className="text-sm text-muted-foreground">
            Your download has started. Store the file somewhere private.
          </p>
        )}
      </section>

      <section
        aria-labelledby="deletion-heading"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft"
      >
        <h2
          id="deletion-heading"
          className="flex items-center gap-2 font-display text-xl font-semibold"
        >
          <Trash2 className="size-5 text-destructive" aria-hidden="true" />
          Data deletion
        </h2>
        <p className="text-sm text-muted-foreground">
          Request deletion of your personal data. We will review it and securely
          delete it in compliance with privacy laws.
        </p>
        {open ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <StatusBadge
              label={DATA_REQUEST_STATUS_LABELS[open.status]}
              tone="warning"
            />
            Deletion requested {formatDate(open.created_at)}
          </p>
        ) : (
          <div className="mt-auto pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                deletion.reset();
                setConfirming(true);
              }}
            >
              Request data deletion
            </Button>
          </div>
        )}
        {requests.isError && (
          <InlineError message="We could not check your earlier requests." />
        )}
      </section>

      <AlertDialog
        open={confirming}
        onOpenChange={(o) => !o && !deletion.isPending && setConfirming(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request data deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              Our team will review your request. Some records must be kept by
              law, and deleting your data can end your treatment and access to
              this portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <InlineError
            message={deletion.isError ? errorMessage(deletion.error) : null}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletion.isPending}>
              Keep my data
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletion.isPending}
              onClick={() => deletion.mutate()}
            >
              {deletion.isPending ? "Sending" : "Request deletion"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

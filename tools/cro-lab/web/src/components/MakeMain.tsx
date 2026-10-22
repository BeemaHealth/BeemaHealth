import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { denverLocalToIso, denverLocalValue } from "@shared/time.ts";
import { api, ApiError } from "../api.ts";
import { useLab } from "../lab.tsx";
import { Button, CopyButton, Field, inputCls } from "../ui.tsx";

/**
 * Switches the page's main variant in the local code and records when it went
 * live in production. The code change is local; nothing ships until the user
 * runs the deploy command.
 */
export function MakeMainDialog({
  pageId,
  variantId,
  onClose,
}: {
  pageId: string;
  variantId: string;
  onClose: () => void;
}) {
  const { state, setState, reload } = useLab();
  const variant = state!.data.variants.find(
    (v) => v.pageId === pageId && v.id === variantId,
  );
  const alreadyMain = state!.mainVariants?.[pageId] === variantId;
  const [recordTime, setRecordTime] = useState(alreadyMain);
  const [when, setWhen] = useState(() => denverLocalValue(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let goLiveAt: string | undefined;
    if (recordTime) {
      const iso = denverLocalToIso(when);
      if (!iso) {
        setError("Enter a valid date and time (Denver time).");
        return;
      }
      goLiveAt = iso;
    }
    setBusy(true);
    try {
      setState(await api.makeMain(pageId, { variantId, goLiveAt }));
      await reload();
      setDone(
        goLiveAt
          ? "Go-live time recorded. Metrics for this variant start from that moment."
          : "The local site now serves this variant for testing. It is not marked ready to deploy. When you want to ship it, mark it ready, run the deploy command, then set the go-live time.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update the page",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="rise fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[min(520px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-bold">
                {alreadyMain
                  ? "Set go-live time"
                  : `Make ${variant?.name ?? variantId} the main page`}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-soft">
                {alreadyMain
                  ? "This variant is already the main one in the local code."
                  : "Edits experiments.json and the generated file so the local site serves this variant. Nothing is deployed."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="cursor-pointer rounded-lg p-1.5 text-faint hover:bg-raised hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {done ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-teal/30 bg-teal/8 p-3 text-sm">
                {done}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CopyButton
                  text="npm run deploy:production"
                  label="Copy deploy command"
                />
                <Button variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {!alreadyMain && (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={recordTime}
                    onChange={(e) => setRecordTime(e.target.checked)}
                  />
                  <span>
                    It is already deployed. Record when it went live.
                    <span className="block text-xs text-faint">
                      Leave unchecked if you have not deployed yet; set the time
                      afterwards from the page.
                    </span>
                  </span>
                </label>
              )}
              {recordTime && (
                <Field label="Went live (Denver time)">
                  <input
                    type="datetime-local"
                    required
                    value={when}
                    max={denverLocalValue(new Date())}
                    onChange={(e) => setWhen(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              )}
              <p className="text-xs text-faint">
                {recordTime
                  ? "The previous variant's window ends at this moment. Days the switch happened mid-day are excluded from totals."
                  : "Ship with `npm run deploy:production` when you are happy with it."}
              </p>
              {error && (
                <p role="alert" className="text-sm text-rose">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={busy}>
                  {alreadyMain || recordTime
                    ? "Record go-live"
                    : "Make main locally"}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

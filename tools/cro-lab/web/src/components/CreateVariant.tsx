import * as Dialog from "@radix-ui/react-dialog";
import { Check, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import type { LabState } from "@shared/types.ts";
import { api, ApiError } from "../api.ts";
import { claudeInstruction, previewUrl } from "../lib.ts";
import { go, useLab } from "../lab.tsx";
import { Button, CopyButton, Field, inputCls } from "../ui.tsx";

export function CreateVariantDialog({
  pageId,
  baseId,
  onClose,
}: {
  pageId: string;
  baseId: string;
  onClose: () => void;
}) {
  const { state, mode, reload } = useLab();
  const variants = state!.data.variants.filter((v) => v.pageId === pageId);
  const [base, setBase] = useState(baseId);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [element, setElement] = useState("");
  const [expected, setExpected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    componentPath: string;
    next: LabState;
  } | null>(null);
  const baseVariant = variants.find((v) => v.id === base);
  const notMigrated =
    mode === "live" &&
    baseVariant &&
    !baseVariant.componentPath.includes("landing-variants");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const out = await api.createVariant(mode, {
        pageId,
        baseVariantId: base,
        name,
        hypothesis,
        element,
        expected,
      });
      const next = await api.state(mode);
      setCreated({ ...out, next });
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create variant",
      );
    } finally {
      setBusy(false);
    }
  }

  const v = created?.next.data.variants.find(
    (x) => x.pageId === pageId && x.id === created.id,
  );
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="rise fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(560px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-bold">
                {created ? "Variant created" : "Create variant"}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-soft">
                {created
                  ? "Edit the new component, preview it locally, then mark it ready. Nothing was deployed."
                  : "Duplicates the base component. The parent is never modified."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="cursor-pointer rounded-lg p-1.5 text-faint hover:bg-raised hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {created && v ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-teal/30 bg-teal/8 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold text-teal">
                  <Check className="size-4" />
                  {v.name} <span className="num text-xs text-soft">{v.id}</span>
                </p>
                <p className="num mt-1 break-all text-xs text-soft">
                  {v.componentPath}
                </p>
                {mode === "demo" && (
                  <p className="mt-1 text-xs text-amber">
                    DEMO mode: no file was written to src/.
                  </p>
                )}
              </div>
              <Field label="Paste into Claude Code to build it">
                <textarea
                  readOnly
                  rows={5}
                  value={claudeInstruction(created.next, v)}
                  className={inputCls + " text-xs"}
                />
              </Field>
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  <CopyButton
                    text={claudeInstruction(created.next, v)}
                    label="Copy instruction"
                  />
                  <CopyButton text={v.componentPath} label="Copy path" />
                </div>
                <div className="flex gap-2">
                  <a
                    href={previewUrl(created.next, v)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-ink hover:bg-raised"
                  >
                    <ExternalLink className="size-3.5" />
                    Preview
                  </a>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      go("page", pageId, v.id);
                    }}
                  >
                    Open variant
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <Field label="Base variant">
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  className={inputCls}
                >
                  {variants.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.id})
                    </option>
                  ))}
                </select>
              </Field>
              {notMigrated && (
                <p className="rounded-lg border border-amber/30 bg-amber/10 p-2.5 text-xs text-amber">
                  This page is still a route file, not on the variant system.
                  Ask Claude Code to migrate it before duplicating (files are
                  not created for route-file pages).
                </p>
              )}
              <Field label="Name">
                <input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Video hero"
                  className={inputCls}
                />
              </Field>
              <Field
                label="Element being changed"
                hint="Test one major variable at a time so results stay interpretable."
              >
                <input
                  required
                  maxLength={120}
                  value={element}
                  onChange={(e) => setElement(e.target.value)}
                  placeholder="Hero image"
                  className={inputCls}
                />
              </Field>
              <Field label="Hypothesis">
                <textarea
                  required
                  maxLength={600}
                  rows={3}
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="A short provider video builds trust faster than a still photo, so more visitors continue to intake."
                  className={inputCls}
                />
              </Field>
              <Field label="Expected outcome (optional)">
                <input
                  maxLength={300}
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder="Higher handoff rate than control"
                  className={inputCls}
                />
              </Field>
              {error && (
                <p role="alert" className="text-sm text-rose">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={busy}
                  disabled={!!notMigrated}
                >
                  Create as draft
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

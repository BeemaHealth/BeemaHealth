import { useEffect, useState } from "react";
import { AddressFields } from "@/components/quiz/AddressFields";
import { Button } from "@/components/ui/button";
import {
  formatShippingAddressLines,
  type ShippingAddressValue,
} from "@/lib/shipping-address";

export type { ShippingAddressValue };

export function ShippingAddressSection({
  value,
  expectedState,
  onSave,
  editing: controlledEditing,
  onEditingChange,
  draft: controlledDraft,
  onDraftChange,
  showActions = true,
}: {
  value: ShippingAddressValue;
  expectedState?: string;
  onSave?: (next: ShippingAddressValue) => Promise<void>;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  draft?: ShippingAddressValue;
  onDraftChange?: (draft: ShippingAddressValue) => void;
  showActions?: boolean;
}) {
  const [internalEditing, setInternalEditing] = useState(false);
  const [internalDraft, setInternalDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const editing = controlledEditing ?? internalEditing;
  const setEditing = onEditingChange ?? setInternalEditing;
  const draft = controlledDraft ?? internalDraft;
  const setDraft = onDraftChange ?? setInternalDraft;

  useEffect(() => {
    if (!editing && controlledDraft === undefined) {
      setInternalDraft(value);
    }
  }, [value, editing, controlledDraft]);

  const lines = formatShippingAddressLines(value);

  function openEditor() {
    setDraft(value);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(value);
    setEditing(false);
  }

  async function saveEdit() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {lines.length > 0 ? (
          <address className="not-italic text-sm leading-relaxed text-foreground">
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        ) : (
          <p className="text-sm text-muted-foreground">
            No shipping address on file.
          </p>
        )}
        {showActions && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={openEditor}
          >
            {lines.length > 0
              ? "Change shipping address"
              : "Add shipping address"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddressFields
        label="Shipping address"
        expectedState={expectedState}
        value={draft}
        onChange={setDraft}
        lockWhenVerified={false}
      />
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={saving}
            onClick={cancelEdit}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={saving}
            onClick={() => void saveEdit()}
          >
            {saving ? "Saving…" : "Save new address"}
          </Button>
        </div>
      )}
    </div>
  );
}

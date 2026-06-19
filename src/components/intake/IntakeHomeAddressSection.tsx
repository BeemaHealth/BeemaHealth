import { useState } from "react";
import { AddressFields } from "@/components/quiz/AddressFields";
import { Button } from "@/components/ui/button";
import {
  formatShippingAddressLines,
  type ShippingAddressValue,
} from "@/lib/shipping-address";

export function IntakeHomeAddressSection({
  value,
  expectedState,
  onSave,
}: {
  value: ShippingAddressValue;
  expectedState?: string;
  onSave: (next: ShippingAddressValue) => void;
}) {
  const savedLines = formatShippingAddressLines(value);
  const hasSavedAddress = savedLines.length > 0;

  const [editing, setEditing] = useState(!hasSavedAddress);
  const [changeFlow, setChangeFlow] = useState(false);
  const [draft, setDraft] = useState(value);

  function openAdd() {
    setChangeFlow(false);
    setDraft({
      address: "",
      city: "",
      zip: "",
      county: "",
      verified: false,
    });
    setEditing(true);
  }

  function openChange() {
    setChangeFlow(true);
    setDraft({
      address: "",
      city: "",
      zip: "",
      county: "",
      verified: false,
    });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(value);
    setChangeFlow(false);
    setEditing(false);
  }

  function handleDraftChange(next: ShippingAddressValue) {
    setDraft(next);
    if (next.verified) {
      onSave(next);
      setChangeFlow(false);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <div className="grid gap-1.5 sm:col-span-2">
        <span className="text-sm font-medium text-foreground">
          Home address<span className="text-destructive"> *</span>
        </span>
        <div className="space-y-3">
          {hasSavedAddress ? (
            <address className="not-italic text-sm leading-relaxed text-foreground">
              {savedLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p className="text-sm text-muted-foreground">
              No home address on file.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={hasSavedAddress ? openChange : openAdd}
          >
            {hasSavedAddress ? "Change home address" : "Add home address"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:col-span-2">
      <AddressFields
        label="Home address"
        expectedState={expectedState}
        value={draft}
        onChange={handleDraftChange}
        lockWhenVerified={false}
        hideVerifiedActions
      />
      {changeFlow && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={cancelEdit}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

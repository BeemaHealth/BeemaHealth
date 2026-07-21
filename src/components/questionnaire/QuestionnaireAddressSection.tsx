import { useState } from "react";
import { AddressFields } from "@/components/quiz/AddressFields";
import { Button } from "@/components/ui/button";
import {
  emptyShippingAddressValue,
  formatShippingAddressLines,
  type ShippingAddressValue,
} from "@/lib/shipping-address";

type QuestionnaireAddressSectionProps = {
  label: string;
  value: ShippingAddressValue;
  expectedState?: string | null;
  onChange: (next: ShippingAddressValue) => void;
  readOnly?: boolean;
};

/**
 * Intake / qualify address step UX: show a saved verified address, let patients
 * change it via Nominatim autocomplete, and cancel back to the saved address.
 */
export function QuestionnaireAddressSection({
  label,
  value,
  expectedState,
  onChange,
  readOnly = false,
}: QuestionnaireAddressSectionProps) {
  const savedLines = formatShippingAddressLines(value);
  const hasSavedAddress = value.verified && savedLines.length > 0;

  const [editing, setEditing] = useState(!hasSavedAddress);
  const [changeFlow, setChangeFlow] = useState(false);
  const [draft, setDraft] = useState(value);

  function openAdd() {
    setChangeFlow(false);
    setDraft(emptyShippingAddressValue());
    setEditing(true);
  }

  function openChange() {
    setChangeFlow(true);
    setDraft(emptyShippingAddressValue());
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
      onChange(next);
      setChangeFlow(false);
      setEditing(false);
    }
  }

  if (readOnly) {
    return (
      <div>
        {savedLines.length > 0 ? (
          <address className="not-italic text-sm leading-relaxed text-foreground rounded-2xl border border-border bg-muted/20 px-4 py-3">
            {savedLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        ) : (
          <p className="text-sm text-muted-foreground">N/A</p>
        )}
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {hasSavedAddress ? (
          <address className="not-italic text-sm leading-relaxed text-foreground rounded-2xl border border-border bg-muted/20 px-4 py-3">
            {savedLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        ) : (
          <p className="text-sm text-muted-foreground">
            No address on file yet.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={hasSavedAddress ? openChange : openAdd}
        >
          {hasSavedAddress
            ? `Change ${label.toLowerCase()}`
            : `Add ${label.toLowerCase()}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddressFields
        label={label}
        expectedState={expectedState}
        value={draft}
        onChange={handleDraftChange}
        lockWhenVerified={false}
        hideVerifiedActions
        hideLabel
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

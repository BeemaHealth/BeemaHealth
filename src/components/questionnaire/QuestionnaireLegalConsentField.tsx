import { Link } from "@tanstack/react-router";

type QuestionnaireLegalConsentFieldProps = {
  value: boolean;
  required?: boolean;
  readOnly?: boolean;
  onChange: (agreed: boolean) => void;
};

/**
 * Terms, Privacy Policy, and Telehealth consent agreement for intake steps.
 */
export function QuestionnaireLegalConsentField({
  value,
  required = true,
  readOnly = false,
  onChange,
}: QuestionnaireLegalConsentFieldProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-4">
      <input
        type="checkbox"
        className="mt-1 size-4 rounded border-input"
        checked={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm leading-relaxed text-foreground">
        I have read and agree to the{" "}
        <Link
          to="/legal/terms"
          className="text-primary underline"
          target="_blank"
        >
          Terms of Service
        </Link>
        ,{" "}
        <Link
          to="/legal/privacy"
          className="text-primary underline"
          target="_blank"
        >
          Privacy Policy
        </Link>
        , and{" "}
        <Link
          to="/legal/telehealth-consent"
          className="text-primary underline"
          target="_blank"
        >
          Telehealth Consent
        </Link>
        .{required ? <span className="text-destructive"> *</span> : null}
      </span>
    </label>
  );
}

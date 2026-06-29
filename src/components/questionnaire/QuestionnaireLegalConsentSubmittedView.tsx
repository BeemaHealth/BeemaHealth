import { CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

type QuestionnaireLegalConsentSubmittedViewProps = {
  agreedAt?: string | null;
  signature?: string | null;
};

function formatAgreedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Read-only portal view for legal consent accepted during dynamic intake. */
export function QuestionnaireLegalConsentSubmittedView({
  agreedAt,
  signature,
}: QuestionnaireLegalConsentSubmittedViewProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 px-4 py-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-2 text-sm leading-relaxed text-foreground">
          <p className="font-medium">
            Terms, Privacy Policy, and Telehealth Consent accepted
          </p>
          <p className="text-muted-foreground">
            You agreed to the{" "}
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
            {agreedAt ? ` on ${formatAgreedDate(agreedAt)}` : " at submission"}.
          </p>
          {signature ? (
            <p className="text-muted-foreground">
              Signature on file:{" "}
              <span className="font-medium text-foreground">{signature}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

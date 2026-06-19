import { useState } from "react";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { Field, QuizShell, inputCls } from "@/components/quiz/quiz-primitives";
import {
  fetchIntakeMe,
  isApiEnabled,
  syncConsent,
  syncIntake,
} from "@/lib/api/client";
import { requireAuth } from "@/lib/auth";
import { computeSafetyFlags } from "@/lib/safety-flags";
import { getEligibility, getIntake, saveSafetyFlags } from "@/lib/storage";
import type { ConsentRecord } from "@/lib/types/mvp";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/consent")({
  ssr: false,
  beforeLoad: async () => {
    const session = await requireAuth({
      redirectTo: "/qualify",
      redirectPath: "/consent",
    });
    if (isApiEnabled()) {
      const intake = await fetchIntakeMe();
      if (!intake) throw redirect({ to: "/intake" });
      return;
    }
    if (!getIntake(session.user.id)) throw redirect({ to: "/intake" });
  },
  component: ConsentPage,
});

function ConsentPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!session) return null;

  const { user } = session;
  const defaultSignature = `${user.first_name} ${user.last_name}`.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || !signature.trim()) {
      setError("Please type your full legal name and confirm below.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const consent: ConsentRecord = {
        id: crypto.randomUUID(),
        user_id: user.id,
        telehealth_consent: true,
        no_guarantee_acknowledgment: true,
        emergency_disclaimer_acknowledgment: true,
        medication_risk_acknowledgment: true,
        compounded_medication_acknowledgment: true,
        privacy_acknowledgment: true,
        typed_signature: signature.trim(),
        signed_at: new Date().toISOString(),
      };
      await syncConsent(consent);

      if (isApiEnabled()) {
        navigate({ to: "/submitted" });
        return;
      }

      const intake = getIntake(user.id);
      if (!intake) {
        throw new Error("Could not load your intake. Please try again.");
      }

      const submitted = {
        ...intake,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await syncIntake(submitted);

      const eligibility = getEligibility(user.id);
      const flags = computeSafetyFlags(user, eligibility, submitted, true);
      saveSafetyFlags(user.id, flags);

      navigate({ to: "/submitted" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlowLayout progress={100}>
      <div className="w-full max-w-2xl">
        <QuizShell label="Submit" title="Sign and submit your intake">
          <p className="text-sm text-muted-foreground">
            You already agreed to the{" "}
            <Link
              to="/legal/intake-acknowledgments"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Intake Acknowledgments &amp; Informed Consent
            </Link>{" "}
            on the previous step. Type your legal name below to sign and submit
            your intake for provider review.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <Field label="Full legal name (typed signature)" required>
              <input
                className={inputCls}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={defaultSignature || "Jordan Avery"}
              />
            </Field>
            <Field label="Date">
              <input
                className={inputCls}
                readOnly
                value={new Date().toLocaleDateString()}
              />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4"
              />
              <span className="text-sm text-foreground">
                I certify that my typed signature applies to the{" "}
                <Link
                  to="/legal/intake-acknowledgments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Intake Acknowledgments &amp; Informed Consent
                </Link>{" "}
                and I am ready to submit my intake for provider review.
              </span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit intake for provider review"}
            </Button>
          </form>
        </QuizShell>
      </div>
    </FlowLayout>
  );
}

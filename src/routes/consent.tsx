import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { Field, QuizShell, inputCls } from "@/components/quiz/quiz-primitives";
import { syncConsent, syncIntake, fetchIntakeMe, isApiEnabled } from "@/lib/api/client";
import { requireAuth } from "@/lib/auth";
import { computeSafetyFlags } from "@/lib/safety-flags";
import { getConsent, getEligibility, getIntake, saveSafetyFlags } from "@/lib/storage";
import type { ConsentRecord } from "@/lib/types/mvp";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/consent")({
  ssr: false,
  beforeLoad: async () => {
    const session = await requireAuth({ redirectTo: "/qualify", redirectPath: "/consent" });
    if (isApiEnabled()) {
      const intake = await fetchIntakeMe();
      if (!intake) throw redirect({ to: "/intake" });
      return;
    }
    if (!getIntake(session.user.id)) throw redirect({ to: "/intake" });
  },
  component: ConsentPage,
});

const SECTIONS = [
  { title: "Telehealth Consent", body: "You consent to receive care via telehealth from a licensed provider through Aretide." },
  { title: "No Guarantee of Prescription", body: "Completing intake does not guarantee a prescription. Treatment decisions are made only by a licensed medical provider." },
  { title: "Emergency Care Disclaimer", body: "Aretide does not provide emergency care. Call 911 for emergencies." },
  { title: "Medication Risk Acknowledgment", body: "Weight-loss medications have risks including GI side effects, gallbladder issues, and other complications discussed in intake." },
  { title: "Compounded Medication Disclosure", body: "Compounded semaglutide, if offered, is not FDA-approved and is only used when legally available and clinically appropriate." },
  { title: "Privacy and Data Use", body: "Prototype storage only — production requires HIPAA-compliant infrastructure, encryption, audit logs, and BAAs." },
  { title: "Accuracy Certification", body: "You certify that your intake information is accurate and complete to the best of your knowledge." },
];

function ConsentPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  if (!session) return null;
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || !signature.trim()) {
      setError("Please type your full legal name and check I agree.");
      return;
    }
    setSubmitting(true);
    try {
      const consent: ConsentRecord = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
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

      const intake = getIntake(session.user.id)!;
      const submitted = {
        ...intake,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await syncIntake(submitted);

      const flags = computeSafetyFlags(
        session.user,
        getEligibility(session.user.id),
        submitted,
        true,
      );
      saveSafetyFlags(session.user.id, flags);

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
        <QuizShell label="Consent" title="Consent and acknowledgments">
          <div className="space-y-4">
            {SECTIONS.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <Field label="Full legal name (typed signature)" required>
              <input className={inputCls} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Jordan Avery" />
            </Field>
            <Field label="Date">
              <input className={inputCls} readOnly value={new Date().toLocaleDateString()} />
            </Field>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4" />
              I agree to all sections above.
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

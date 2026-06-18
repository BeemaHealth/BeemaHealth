import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { Field, QuizShell, inputCls } from "@/components/quiz/quiz-primitives";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail, verifyEmail } from "@/lib/api/client";
import { requireAuth } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { extractVerificationToken } from "@/lib/verification";

export const Route = createFileRoute("/verify-email/pending")({
  ssr: false,
  beforeLoad: async () => {
    const session = await requireAuth({ redirectTo: "/qualify", redirectPath: "/intake" });
    if (session.user.email_verified) throw redirect({ to: "/intake" });
  },
  component: VerifyEmailPendingPage,
});

function VerifyEmailPendingPage() {
  const navigate = useNavigate();
  const { session, refreshAuth } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!session) return null;

  async function handleResend() {
    setSending(true);
    setError("");
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend email.");
    } finally {
      setSending(false);
    }
  }

  async function handleManualVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = extractVerificationToken(verifyInput);
    if (!token) {
      setError("Paste the verification link from your email, or the token from that link.");
      return;
    }

    setVerifying(true);
    setError("");
    try {
      await verifyEmail(token);
      await refreshAuth();
      navigate({ to: "/intake" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <FlowLayout progress={0}>
      <QuizShell
        label="Check your email"
        title="Verify your email to continue"
        subtitle={`We sent a verification link to ${session.user.email}. Open the email and either click the link or paste it below.`}
      >
        <div className="grid gap-4">
          <form onSubmit={(e) => void handleManualVerify(e)} className="grid gap-3">
            <Field label="Verification link or token" required>
              <input
                className={inputCls}
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Paste the link from your email"
                autoComplete="off"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={verifying || !verifyInput.trim()}>
              {verifying ? "Verifying…" : "Verify email"}
            </Button>
          </form>

          <Button variant="outline" className="w-full" onClick={() => void handleResend()} disabled={sending}>
            {sending ? "Sending…" : sent ? "Email sent again" : "Resend verification email"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-center text-sm text-muted-foreground">
            Wrong email?{" "}
            <Link to="/login" search={{ redirect: "/intake" }} className="text-primary underline">
              Log in with a different account
            </Link>
          </p>
        </div>
      </QuizShell>
    </FlowLayout>
  );
}

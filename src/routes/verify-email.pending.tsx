import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { MailWarning } from "lucide-react";
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
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!session) return null;

  async function handleContinueAfterVerify() {
    setChecking(true);
    setError("");
    try {
      const refreshed = await refreshAuth();
      if (refreshed?.user.email_verified) {
        navigate({ to: "/intake" });
      } else {
        setError("Not verified yet — open your email and click the verification link first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check verification status.");
    } finally {
      setChecking(false);
    }
  }

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
      setError("Paste the full verification link from your email.");
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
        subtitle={`We sent a verification link to ${session.user.email}. Open your email and click the link — that verifies your account automatically.`}
      >
        <div className="grid gap-4">
          <div
            className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3"
            role="note"
          >
            <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Check your spam or junk folder.</span> If you don&apos;t
              see the email within a few minutes, verification messages often land there first.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            The link may open in a new tab. After you click it, return here and press continue below.
          </p>

          <Button
            className="w-full"
            onClick={() => void handleContinueAfterVerify()}
            disabled={checking}
          >
            {checking ? "Checking…" : "I verified my email — continue"}
          </Button>

          <Button variant="outline" className="w-full" onClick={() => void handleResend()} disabled={sending}>
            {sending ? "Sending…" : sent ? "Email sent again" : "Resend verification email"}
          </Button>

          <details className="rounded-2xl border border-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Link won&apos;t open?
            </summary>
            <form onSubmit={(e) => void handleManualVerify(e)} className="mt-3 grid gap-3">
              <Field label="Paste verification link">
                <input
                  className={inputCls}
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="Paste the link from your email"
                  autoComplete="off"
                />
              </Field>
              <Button type="submit" variant="secondary" className="w-full" disabled={verifying || !verifyInput.trim()}>
                {verifying ? "Verifying…" : "Verify with pasted link"}
              </Button>
            </form>
          </details>

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

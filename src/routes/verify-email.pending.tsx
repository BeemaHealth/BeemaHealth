import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { QuizShell } from "@/components/quiz/quiz-primitives";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/api/client";
import { requireAuth } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/verify-email/pending")({
  ssr: false,
  beforeLoad: async () => {
    const session = await requireAuth({ redirectTo: "/qualify", redirectPath: "/intake" });
    if (session.user.email_verified) throw redirect({ to: "/intake" });
  },
  component: VerifyEmailPendingPage,
});

function VerifyEmailPendingPage() {
  const { session } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <FlowLayout progress={0}>
      <QuizShell
        label="Check your email"
        title="Verify your email to continue"
        subtitle={`We sent a verification link to ${session.user.email}. Click the link in that email, then return here to start your medical intake.`}
      >
        <div className="grid gap-3">
          <Button className="w-full" onClick={() => void handleResend()} disabled={sending}>
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

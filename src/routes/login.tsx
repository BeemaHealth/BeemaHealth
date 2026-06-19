import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginMfa, loginUser } from "@/lib/api/client";
import type { SessionUser } from "@/lib/types/mvp";
import { useAuth } from "@/context/AuthContext";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import {
  Field,
  PasswordInput,
  QuizShell,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/dashboard",
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await loginUser(email, password);
      if ("mfa_required" in result && result.mfa_required) {
        setMfaChallengeId(result.mfa_challenge_id);
        return;
      }
      const session = result as SessionUser;
      setSession(session);
      if (!session.user.email_verified && redirect === "/intake") {
        navigate({ to: "/verify-email/pending" });
        return;
      }
      navigate({ to: redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallengeId) return;
    setError("");
    setSubmitting(true);
    try {
      const session = await loginMfa(mfaChallengeId, mfaCode);
      setSession(session);
      navigate({ to: redirect });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid verification code.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlowLayout progress={0}>
      <QuizShell
        label="Login"
        title={mfaChallengeId ? "Verify your sign-in" : "Welcome back"}
      >
        {mfaChallengeId ? (
          <form onSubmit={handleMfaSubmit} className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to your email to finish signing in.
            </p>
            <Field label="Verification code" required>
              <input
                className={inputCls}
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Verifying…" : "Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMfaChallengeId(null);
                setMfaCode("");
                setError("");
              }}
            >
              Back to login
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field label="Email" required>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" required>
              <PasswordInput value={password} onChange={setPassword} />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Log in"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New patient?{" "}
          <Link to="/qualify" className="text-primary underline">
            Start eligibility check
          </Link>
        </p>
      </QuizShell>
    </FlowLayout>
  );
}

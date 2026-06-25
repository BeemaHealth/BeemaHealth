import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { loginMfa, loginUser } from "@/lib/api/client";
import { storeLoginCredentials } from "@/lib/credential-storage";
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

function redirectAfterLogin(session: SessionUser, redirect: string) {
  // Staff always land in the staff portal unless they explicitly requested elsewhere.
  if (session.user.is_staff && redirect === "/dashboard") {
    window.location.assign("/staff");
    return;
  }
  const target =
    !session.user.email_verified && redirect === "/intake"
      ? "/verify-email/pending"
      : redirect;
  // Full navigation helps browsers detect a successful login and offer to save credentials.
  window.location.assign(target);
}

async function finishLogin(
  session: SessionUser,
  redirect: string,
  email: string,
  password: string,
  setSession: (session: SessionUser) => void,
) {
  setSession(session);
  await storeLoginCredentials(email, password);
  redirectAfterLogin(session, redirect);
}

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { setSession } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [credentialsLocked, setCredentialsLocked] = useState(true);
  const [error, setError] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function readCredentials() {
    return {
      email: emailRef.current?.value ?? "",
      password: passwordRef.current?.value ?? "",
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mfaChallengeId) return;
    const { email, password } = readCredentials();
    setError("");
    setSubmitting(true);
    try {
      const result = await loginUser(email, password);
      if ("mfa_required" in result && result.mfa_required) {
        setMfaChallengeId(result.mfa_challenge_id);
        return;
      }
      const session = result as SessionUser;
      await finishLogin(session, redirect, email, password, setSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallengeId) return;
    const { email, password } = readCredentials();
    setError("");
    setSubmitting(true);
    try {
      const session = await loginMfa(mfaChallengeId, mfaCode);
      await finishLogin(session, redirect, email, password, setSession);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid verification code.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function unlockCredentials() {
    setCredentialsLocked(false);
  }

  return (
    <FlowLayout progress={0}>
      <QuizShell
        label="Login"
        title={mfaChallengeId ? "Verify your sign-in" : "Welcome back"}
      >
        <form
          method="post"
          action="/login"
          autoComplete="on"
          onSubmit={mfaChallengeId ? handleMfaSubmit : handleSubmit}
          className="grid gap-4"
        >
          <div
            className={mfaChallengeId ? "sr-only" : "grid gap-4"}
            aria-hidden={mfaChallengeId ? true : undefined}
          >
            <Field label="Email" required>
              <input
                ref={emailRef}
                id="login-username"
                name="username"
                type="email"
                className={inputCls}
                autoComplete="username"
                required
                tabIndex={mfaChallengeId ? -1 : undefined}
                readOnly={credentialsLocked}
                onFocus={unlockCredentials}
              />
            </Field>
            <Field label="Password" required>
              <PasswordInput
                ref={passwordRef}
                id="login-password"
                name="password"
                autoComplete="current-password"
                required
                tabIndex={mfaChallengeId ? -1 : undefined}
                autofillHack
                onFocus={unlockCredentials}
              />
            </Field>
          </div>

          {mfaChallengeId && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to your email to finish signing in.
              </p>
              <Field label="Verification code" required>
                <input
                  id="login-mfa-code"
                  name="otp"
                  className={inputCls}
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) =>
                    setMfaCode(e.target.value.replace(/\D/g, ""))
                  }
                  autoComplete="one-time-code"
                  required
                />
              </Field>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? mfaChallengeId
                ? "Verifying…"
                : "Signing in…"
              : mfaChallengeId
                ? "Continue"
                : "Log in"}
          </Button>
          {mfaChallengeId && (
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
          )}
        </form>
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

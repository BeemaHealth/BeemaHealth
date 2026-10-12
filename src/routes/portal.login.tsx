import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchMe,
  isValidEmail,
  LINK_SENT_MESSAGE,
  requestLoginLink,
  verifyEmailCode,
} from "@/lib/api/portal/auth";
import { ApiError } from "@/lib/api/portal/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

const RESEND_SECONDS = 30;

export const Route = createFileRoute("/portal/login")({
  ssr: false,
  beforeLoad: async () => {
    try {
      await fetchMe();
    } catch {
      return;
    }
    throw redirect({ to: "/portal" as "/", replace: true });
  },
  component: PortalLogin,
});

function PortalLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (showCode) codeRef.current?.focus();
  }, [showCode]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (sending || cooldown > 0) return;
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    setSendError("");
    setSending(true);
    try {
      await requestLoginLink(email);
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      // Validation and server failures never say whether the email has an account.
      setSendError(
        err instanceof ApiError && err.status === 429
          ? err.message
          : "We could not send your link right now. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (verifying) return;
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Enter the 6 digit code from your email.");
      return;
    }
    setCodeError("");
    setVerifying(true);
    try {
      await verifyEmailCode(email, code);
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      await navigate({ to: "/portal" as "/", replace: true });
    } catch (err) {
      setCodeError(
        err instanceof ApiError && (err.status === 400 || err.status === 429)
          ? err.message
          : "We could not verify that code. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Logo className="h-12" />
        </div>
        <div className="rounded-3xl border border-border bg-card p-7 shadow-lift sm:p-9">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign in to your portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we will send you a secure sign-in link. No
            password needed.
          </p>

          <form onSubmit={handleSend} noValidate className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-email">Email</Label>
              <Input
                id="portal-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "portal-email-error" : undefined}
              />
              {emailError && (
                <p
                  id="portal-email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {emailError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={sending || cooldown > 0}
            >
              {sending
                ? "Sending..."
                : cooldown > 0
                  ? `Send again in ${cooldown}s`
                  : sent
                    ? "Send a new link"
                    : "Send me a link"}
            </Button>
          </form>

          {sendError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {sendError}
            </p>
          )}
          {sent && (
            <p
              role="status"
              className="mt-4 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-foreground"
            >
              {LINK_SENT_MESSAGE}
            </p>
          )}

          <div className="mt-6 border-t border-border pt-5">
            {!showCode ? (
              <button
                type="button"
                onClick={() => {
                  if (!isValidEmail(email)) {
                    setEmailError(
                      "Enter your email first, then use your code.",
                    );
                    return;
                  }
                  setShowCode(true);
                }}
                className="rounded text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Have a code? Enter it instead
              </button>
            ) : (
              <form onSubmit={handleVerify} noValidate className="space-y-3">
                <Label htmlFor="portal-code">6 digit code</Label>
                <Input
                  id="portal-code"
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby={codeError ? "portal-code-error" : undefined}
                  className="text-center font-display text-xl tracking-[0.4em]"
                />
                {codeError && (
                  <p
                    id="portal-code-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {codeError}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={verifying}
                >
                  {verifying ? "Verifying..." : "Sign in with code"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}

import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api/portal/client";
import {
  claimSubmission,
  requestLoginCode,
  verifyLoginCode,
} from "@/lib/api/portal/questionnaire";
import { isValidEmail } from "@/lib/form-validation";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ContinueButton, ErrorNote, FIELD_CLASS, NodeFrame } from "../ui";
import type { NodeRendererProps } from "../types";

/**
 * Passwordless account creation: email, then the six digit code we send. Signing in
 * creates the account, then `claim` attaches this questionnaire to it. The email lives in
 * component state only (never storage, never the URL).
 */
export function AuthNode({ node, onView, onRefresh }: NodeRendererProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function sendCode(isResend = false) {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await requestLoginCode(trimmed);
      setEmail(trimmed);
      setStep("code");
      setResent(isResend);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function verify(value: string) {
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6 digit code from your email.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await verifyLoginCode(email, value);
    } catch (err) {
      setWorking(false);
      setCode("");
      setError(
        err instanceof ApiError
          ? err.message
          : "That code did not work. Please try again.",
      );
      return;
    }
    try {
      onView(await claimSubmission());
    } catch (err) {
      // Already linked (a refresh after a successful claim): just reload the server state.
      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 409)
      ) {
        await onRefresh();
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setWorking(false);
    }
  }

  if (step === "email") {
    return (
      <NodeFrame title={node.title} body={node.body} icon="shield">
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-label="Email address"
              className={`${FIELD_CLASS} pl-12`}
              value={email}
              disabled={working}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
          </div>
          <ErrorNote message={error} />
          <ContinueButton
            label="Email me a code"
            busy={working}
            savingLabel="Sending"
          />
        </form>
      </NodeFrame>
    );
  }

  return (
    <NodeFrame
      title="Check your email"
      body={`We sent a 6 digit code to ${email}. Enter it below to continue.`}
      icon="shield"
    >
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
      >
        <div className="flex flex-col gap-3">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              setCode(v.replace(/\D/g, ""));
              setError(null);
            }}
            onComplete={(v) => void verify(v)}
            disabled={working}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6 digit code"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-14 w-11 text-lg sm:w-12"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {resent
              ? "A new code is on its way."
              : "The code expires soon. Check spam if you do not see it."}
          </p>
        </div>
        <ErrorNote message={error} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ContinueButton
            label="Verify and continue"
            busy={working}
            savingLabel="Verifying"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => void sendCode(true)}
            disabled={working}
          >
            Send a new code
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            disabled={working}
          >
            Use a different email
          </Button>
        </div>
      </form>
    </NodeFrame>
  );
}

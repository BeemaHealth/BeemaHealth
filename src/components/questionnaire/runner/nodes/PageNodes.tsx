import { useState } from "react";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { isValidEmail } from "@/lib/form-validation";
import {
  ContinueButton,
  ErrorNote,
  FIELD_CLASS,
  NodeFrame,
  Reveal,
} from "../ui";
import type { NodeRendererProps } from "../types";

export function EmptyPageNode({
  node,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const cfg = layout.node_types?.empty_page;
  return (
    <NodeFrame
      title={node.title}
      body={node.body}
      icon={node.icon ?? "target"}
      align={cfg?.align === "left" ? "left" : "center"}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(true);
        }}
        className="flex w-full flex-col items-center gap-4"
      >
        <ErrorNote message={error} />
        <ContinueButton
          label={
            node.button_label ??
            cfg?.button_label ??
            layout.copy?.continue ??
            "Continue"
          }
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

export function SafetyConsentNode({
  node,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const cfg = layout.node_types?.safety_consent;
  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon ?? "shield"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit({ accepted: true });
        }}
        className="flex flex-col gap-6"
      >
        <blockquote className="rounded-2xl border border-border bg-card p-5 text-base leading-relaxed text-foreground shadow-soft sm:p-6 sm:text-lg">
          {node.statement}
        </blockquote>
        <ErrorNote message={error} />
        <ContinueButton
          label={node.button_label ?? cfg?.button_label ?? "I agree"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

const REASON_SUPPORT: Record<string, string> = {
  under_18: "You are welcome back the day you turn 18.",
  state_unavailable:
    "We are growing state by state, and your email gets you the first note.",
};

/** A warm, never-dead-end stop. Always offers a way back, a way home, and a human. */
export function NoProceedNode({
  node,
  busy,
  error,
  onSubmit,
  onBack,
  disqualifyReason,
}: NodeRendererProps) {
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);
    if (await onSubmit({ email: trimmed })) setSaved(true);
  }

  const support = disqualifyReason
    ? REASON_SUPPORT[disqualifyReason]
    : undefined;

  return (
    <NodeFrame
      title={node.title}
      body={node.body}
      icon={node.icon ?? "info"}
      align="center"
      tone="info"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {support ? (
          <p className="text-base text-muted-foreground">{support}</p>
        ) : null}

        {node.collect_email ? (
          saved ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-2xl bg-success/15 px-5 py-4 text-base font-semibold text-success"
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              Thank you. We will email you as soon as we are in your state.
            </p>
          ) : (
            <form
              className="flex w-full flex-col gap-3"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void saveEmail();
              }}
            >
              <label htmlFor="no-proceed-email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="no-proceed-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${FIELD_CLASS} pl-12`}
                  value={email}
                  disabled={busy}
                  aria-invalid={localError ? true : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLocalError(null);
                  }}
                />
              </div>
              <ErrorNote message={localError ?? error} />
              <ContinueButton label="Notify me" busy={busy} />
            </form>
          )
        ) : null}

        <Reveal index={4} className="flex w-full flex-col items-center gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onBack}
              disabled={busy}
            >
              <ArrowLeft aria-hidden="true" />
              Change an answer
            </Button>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium">
            <a
              className="text-foreground underline underline-offset-4 hover:text-primary-foreground"
              href="/"
            >
              Back to Beema Health
            </a>
            <a
              className="text-foreground underline underline-offset-4 hover:text-primary-foreground"
              href="/contact"
            >
              Talk to our team
            </a>
          </div>
        </Reveal>
      </div>
    </NodeFrame>
  );
}

export function ThankYouNode({ node }: NodeRendererProps) {
  const reduce = useReducedMotion();
  return (
    <NodeFrame title={node.title} body={node.body} align="center">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <motion.span
          aria-hidden="true"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-success text-success-foreground shadow-lift"
          initial={reduce ? false : { scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
        >
          <Check className="h-12 w-12" strokeWidth={3} />
        </motion.span>
        <Button asChild size="xl" className="w-full sm:w-auto">
          <a href="/portal">Go to your portal</a>
        </Button>
      </div>
    </NodeFrame>
  );
}

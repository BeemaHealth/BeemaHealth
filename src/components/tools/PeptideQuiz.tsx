import { useReducer, useRef, useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SurfaceCard } from "@/components/site/primitives";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  EMAIL_STEP,
  INITIAL_QUIZ_STATE,
  QUIZ_LENGTH,
  RESULTS_STEP,
  QUIZ_QUESTIONS,
  getQuizResult,
  quizReducer,
  type PartialAnswers,
} from "@/lib/peptide-quiz";
import {
  CATEGORY_CONTENT,
  INTAKE_CTA_NOTE,
  QUIZ_DISCLAIMER,
  QUIZ_EMAIL_CONSENT,
  RESULT_PREVIEW,
  QUIZ_PRIVACY_NOTE,
  SIX_STEPS,
  flagNotes,
  showIntakeCta,
  suggestedStep,
} from "@/lib/peptide-quiz-content";
import { isValidQuizEmail, submitQuizLead } from "@/lib/peptide-quiz-submit";
import { cn } from "@/lib/utils";

function Disclaimer() {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground"
    >
      <Info
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-primary"
      />
      <p>{QUIZ_DISCLAIMER}</p>
    </div>
  );
}

/**
 * One question per screen. Answers live only in this reducer: no browser
 * storage and no analytics or pixels. The only network call is the email gate,
 * which sends only the email address to Formspree (peptide-quiz-submit.ts).
 * Quiz answers are never sent anywhere.
 */
export function PeptideQuiz() {
  const [state, dispatch] = useReducer(quizReducer, INITIAL_QUIZ_STATE);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new screen heading on step changes (not on first paint).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  const question = QUIZ_QUESTIONS[state.step];
  const result =
    state.step === RESULTS_STEP ? getQuizResult(state.answers) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Disclaimer />

      <SurfaceCard>
        <div aria-live="polite" className="sr-only">
          {question
            ? `Question ${state.step + 1} of ${QUIZ_LENGTH}: ${question.prompt}`
            : state.step === EMAIL_STEP
              ? "Your results are ready: enter your email to see them"
              : "Your starting point"}
        </div>

        {question ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Question {state.step + 1} of {QUIZ_LENGTH}
            </p>
            <div
              aria-hidden="true"
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${((state.step + 1) / QUIZ_LENGTH) * 100}%` }}
              />
            </div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-5 text-balance text-2xl font-semibold tracking-tight text-foreground focus:outline-none"
            >
              {question.prompt}
            </h2>
            <RadioGroup
              key={question.id}
              aria-label={question.prompt}
              className="mt-5 gap-3"
              value={state.answers[question.id] ?? ""}
              onValueChange={(value) => dispatch({ type: "select", value })}
            >
              {question.options.map((option) => {
                const id = `quiz-${question.id}-${option.value}`;
                const selected = state.answers[question.id] === option.value;
                return (
                  <Label
                    key={option.value}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 text-base font-medium leading-snug text-foreground transition-colors hover:border-primary/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
                      selected && "border-primary bg-primary/5",
                    )}
                  >
                    <RadioGroupItem id={id} value={option.value} />
                    {option.label}
                  </Label>
                );
              })}
            </RadioGroup>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => dispatch({ type: "back" })}
                disabled={state.step === 0}
              >
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
              <Button
                type="button"
                onClick={() => dispatch({ type: "next" })}
                disabled={state.answers[question.id] === undefined}
              >
                {state.step === QUIZ_LENGTH - 1
                  ? "See your starting point"
                  : "Next"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : state.step === EMAIL_STEP ? (
          <EmailGate
            answers={state.answers}
            headingRef={headingRef}
            onBack={() => dispatch({ type: "back" })}
            onUnlocked={() => dispatch({ type: "unlock" })}
          />
        ) : result ? (
          <ResultView
            result={result}
            onBack={() => dispatch({ type: "back" })}
            onRestart={() => dispatch({ type: "restart" })}
            headingRef={headingRef}
          />
        ) : null}
      </SurfaceCard>

      <p className="text-center text-sm text-muted-foreground">
        {QUIZ_PRIVACY_NOTE}
      </p>
    </div>
  );
}

function EmailGate({
  answers,
  headingRef,
  onBack,
  onUnlocked,
}: {
  answers: PartialAnswers;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onUnlocked: () => void;
}) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!isValidQuizEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    // Honeypot tripped: pretend success without sending anything.
    if (honeypot) {
      onUnlocked();
      return;
    }
    const complete = getQuizResult(answers);
    if (!complete) return;
    setError(null);
    setSending(true);
    const res = await submitQuizLead(email);
    setSending(false);
    if (res.ok) onUnlocked();
    else setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        Your results are ready
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground focus:outline-none"
      >
        See your starting point
      </h2>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
        Your answers pointed to{" "}
        <span className="font-semibold text-foreground">
          {CATEGORY_CONTENT[answers.goal ?? "unsure"].title}
        </span>
        . Enter your email to see your results list on the next screen.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {RESULT_PREVIEW.map((item) => (
          <li key={item} className="flex gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <Label htmlFor="quiz-email" className="text-sm font-medium">
          Email address
        </Label>
        <Input
          id="quiz-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "quiz-email-error" : "quiz-email-consent"}
          className="mt-1.5"
        />
        {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        >
          <label>
            Company
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p
            id="quiz-email-error"
            role="alert"
            className="mt-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <p
          id="quiz-email-consent"
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
        >
          {QUIZ_EMAIL_CONSENT}{" "}
          <Link to="/legal/privacy/" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={sending}
        >
          <ArrowLeft aria-hidden="true" /> Back
        </Button>
        <Button type="submit" disabled={sending}>
          {sending ? "One moment..." : "See my results"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

function ResultView({
  result,
  onBack,
  onRestart,
  headingRef,
}: {
  result: NonNullable<ReturnType<typeof getQuizResult>>;
  onBack: () => void;
  onRestart: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const content = CATEGORY_CONTENT[result.category];
  const notes = flagNotes(result);
  const start = suggestedStep(result);
  const cta = resolveCta(CTA_IDS.tools_peptide_quiz);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Your starting point
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground focus:outline-none"
        >
          {content.title}
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          {content.summary}
        </p>
      </div>

      <Disclaimer />

      <section aria-labelledby="quiz-evidence">
        <h3
          id="quiz-evidence"
          className="text-lg font-semibold text-foreground"
        >
          What the evidence looks like for this goal
        </h3>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
          {content.evidence}
        </p>
        {notes.map((note) => (
          <p
            key={note}
            className="mt-3 text-pretty leading-relaxed text-muted-foreground"
          >
            {note}
          </p>
        ))}
      </section>

      <section aria-labelledby="quiz-questions">
        <h3
          id="quiz-questions"
          className="text-lg font-semibold text-foreground"
        >
          Questions to bring to a clinician
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          {content.clinicianQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quiz-steps">
        <h3 id="quiz-steps" className="text-lg font-semibold text-foreground">
          The six steps, and where you might begin
        </h3>
        <ol className="mt-3 space-y-2">
          {SIX_STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-baseline gap-3 rounded-xl px-3 py-2 text-sm",
                i + 1 === start
                  ? "bg-primary/10 font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span aria-hidden="true">{i + 1}</span>
              <span>
                {label}
                {i + 1 === start ? " (a good place to begin)" : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="quiz-links">
        <h3 id="quiz-links" className="text-lg font-semibold text-foreground">
          Keep reading
        </h3>
        <ul className="mt-3 space-y-3">
          {content.links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {link.label}
              </Link>
              <span className="block text-sm text-muted-foreground">
                {link.note}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {showIntakeCta(result) && (
        <section
          aria-labelledby="quiz-cta"
          className="rounded-2xl border border-border bg-muted/40 p-5"
        >
          <h3 id="quiz-cta" className="text-lg font-semibold text-foreground">
            If you want a licensed provider to review your situation
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {INTAKE_CTA_NOTE}
          </p>
          <Button asChild className="mt-4">
            <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
              {cta.label} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Change an answer
        </Button>
        <Button type="button" variant="outline" onClick={onRestart}>
          Start over
        </Button>
      </div>
    </div>
  );
}

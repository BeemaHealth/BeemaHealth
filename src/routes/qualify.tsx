import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Eyebrow, FloatingHexagons } from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import { Button } from "@/components/ui/button";
import { US_STATES } from "@/lib/veya-data";
import { isValidEmail, isValidPersonName } from "@/lib/form-validation";
import { trackCtaClicked, trackPageViewed } from "@/lib/analytics";
import { canonicalUrl } from "@/lib/seo";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xwvgljjr";

export const Route = createFileRoute("/qualify")({
  head: () => ({
    meta: [
      { title: "Join the waitlist | Beema Health" },
      {
        name: "description",
        content:
          "Beema Health is getting ready to launch. Join the waitlist for early-adopter pricing on medical weight-loss care.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/qualify") }],
  }),
  component: WaitlistPage,
});

type FormState = {
  name: string;
  email: string;
  location: string;
  company: string; // honeypot — real users never fill this in
};

const initial: FormState = { name: "", email: "", location: "", company: "" };

function fieldError(data: FormState): string | null {
  if (!data.name.trim()) return "Enter your name.";
  if (!isValidPersonName(data.name)) return "Enter a valid name.";
  if (!data.email.trim()) return "Enter your email.";
  if (!isValidEmail(data.email)) return "Enter a valid email address.";
  if (!data.location) return "Select your state.";
  return null;
}

function WaitlistPage() {
  useEffect(() => {
    trackPageViewed("qualify");
  }, []);

  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<FormState>(initial);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [error, setError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const validationError = fieldError(data);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (validationError) return;
    if (data.company) {
      // Honeypot tripped — pretend success without submitting.
      setConfirmedEmail(data.email.trim());
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          location: data.location,
          _subject: "New Beema Health waitlist signup",
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      trackCtaClicked("waitlist_submit", "qualify");
      setConfirmedEmail(data.email.trim());
      setSubmitted(true);
    } catch {
      setError(
        "Something went wrong submitting your info. Please try again, or email us directly at support@beemahealth.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero py-16 md:py-24">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <FloatingHexagons className="z-0" />

        <div className="veya-container relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
          >
            <Eyebrow>Coming soon</Eyebrow>
          </motion.div>

          <h1 className="mt-4 max-w-2xl text-balance text-center text-4xl font-bold leading-[1.05] text-foreground md:text-5xl">
            <LineReveal delay={0.05}>We&apos;re getting ready</LineReveal>
            <LineReveal delay={0.15}>to launch</LineReveal>
          </h1>

          <motion.p
            className="mt-5 max-w-xl text-pretty text-center text-base leading-relaxed text-muted-foreground md:text-lg"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 0.35,
              ease: EASE_OUT,
            }}
          >
            Beema Health is putting the finishing touches on our medical
            weight-loss platform. Join the waitlist and we&apos;ll email you as
            soon as we&apos;re live, plus an early-adopter discount for signing
            up now.
          </motion.p>

          <motion.div
            className="relative mt-10 w-full max-w-lg"
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 24,
              scale: reduceMotion ? 1 : 0.97,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              delay: reduceMotion ? 0 : 0.5,
              ease: EASE_OUT,
            }}
          >
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 -z-10 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
            />
            <div className="rounded-4xl border border-border bg-card p-6 shadow-lift md:p-8">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{
                      opacity: 0,
                      scale: reduceMotion ? 1 : 0.9,
                    }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.5,
                      ease: EASE_OUT,
                    }}
                    className="flex flex-col items-center gap-3 py-6 text-center"
                  >
                    <CheckCircle2 className="size-10 text-accent-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">
                      You&apos;re on the list
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll email you at{" "}
                      <span className="font-medium text-foreground">
                        {confirmedEmail}
                      </span>{" "}
                      when we launch, with your early-adopter discount.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    noValidate
                    className="grid gap-4"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  >
                    <Field label="Name" required>
                      <input
                        type="text"
                        className={inputCls}
                        value={data.name}
                        onChange={(e) => set("name", e.target.value)}
                        autoComplete="name"
                        maxLength={60}
                      />
                    </Field>
                    <Field label="Email" required>
                      <input
                        type="email"
                        className={inputCls}
                        value={data.email}
                        onChange={(e) => set("email", e.target.value)}
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Location" required>
                      <select
                        className={inputCls}
                        value={data.location}
                        onChange={(e) => set("location", e.target.value)}
                      >
                        <option value="">Choose a state</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <input
                      type="text"
                      name="company"
                      value={data.company}
                      onChange={(e) => set("company", e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="absolute -left-[9999px] h-0 w-0 opacity-0"
                    />
                    {touched && validationError && (
                      <p className="text-sm text-destructive">
                        {validationError}
                      </p>
                    )}
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      type="submit"
                      size="xl"
                      disabled={submitting}
                      className="mt-2 w-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Joining…
                        </>
                      ) : (
                        <>
                          <Mail className="size-4" /> Join the waitlist
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}

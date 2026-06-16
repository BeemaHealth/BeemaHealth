import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LAUNCH_STATES, US_STATES } from "@/lib/veya-data";

export const Route = createFileRoute("/qualify")({
  head: () => ({
    meta: [
      { title: "See if you qualify — Aretide" },
      {
        name: "description",
        content:
          "A few simple questions to check your eligibility for Aretide weight-management care. No commitment. Prescribing is never guaranteed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QualifyPage,
});

type Intent = "new" | "switch";

type FormData = {
  intent: Intent | null;
  state: string;
  legalName: string;
  dob: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  goals: string[];
  priorGlp1: "yes" | "no" | null;
  priorDetails: string;
  conditions: string[];
  hasInsurance: "yes" | "no" | null;
  pharmacyPref: string;
  email: string;
  phone: string;
  consent: boolean;
};

const initial: FormData = {
  intent: null,
  state: "",
  legalName: "",
  dob: "",
  heightFt: "",
  heightIn: "",
  weight: "",
  goals: [],
  priorGlp1: null,
  priorDetails: "",
  conditions: [],
  hasInsurance: null,
  pharmacyPref: "",
  email: "",
  phone: "",
  consent: false,
};

const GOALS = [
  "Lose weight",
  "Improve energy",
  "Reduce cravings",
  "Improve blood sugar",
  "Build sustainable habits",
  "Other",
];

const CONDITIONS = [
  "Type 2 diabetes",
  "Pregnant or breastfeeding",
  "History of pancreatitis",
  "Gallbladder disease",
  "Personal/family history of medullary thyroid cancer or MEN2",
  "History of an eating disorder",
];

const PHARMACY = [
  "Local pharmacy pickup",
  "Shipped to me",
  "Cheapest option",
  "Fastest option",
  "Help me decide",
];

const STEP_LABELS = [
  "Start",
  "Your state",
  "About you",
  "Goals",
  "Prior medication",
  "Health history",
  "Insurance & pharmacy",
  "Your account",
  "Review",
];

function QualifyPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initial);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleArr = (key: "goals" | "conditions", value: string) =>
    setData((d) => {
      const arr = d[key];
      return {
        ...d,
        [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
      };
    });

  const stateAvailable = useMemo(
    () => (LAUNCH_STATES as readonly string[]).includes(data.state),
    [data.state],
  );

  const bmi = useMemo(() => {
    const ft = Number(data.heightFt);
    const inch = Number(data.heightIn);
    const w = Number(data.weight);
    const totalIn = ft * 12 + inch;
    if (!totalIn || !w) return null;
    return ((w / (totalIn * totalIn)) * 703).toFixed(1);
  }, [data.heightFt, data.heightIn, data.weight]);

  // If state chosen but unavailable, show waitlist branch instead of progressing.
  const waitlist = step === 1 && data.state !== "" && !stateAvailable;

  const canContinue = (() => {
    switch (step) {
      case 0:
        return data.intent !== null;
      case 1:
        return data.state !== "" && stateAvailable;
      case 2:
        return data.legalName && data.dob && data.heightFt && data.weight;
      case 3:
        return data.goals.length > 0;
      case 4:
        return data.priorGlp1 !== null;
      case 5:
        return true; // conditions optional (none is valid)
      case 6:
        return data.hasInsurance !== null && data.pharmacyPref !== "";
      case 7:
        return /\S+@\S+\.\S+/.test(data.email) && data.phone.length >= 7 && data.consent;
      default:
        return true;
    }
  })();

  const totalSteps = STEP_LABELS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  if (submitted) return <Confirmation intent={data.intent} />;

  return (
    <div className="flex min-h-screen flex-col bg-grad-hero">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="veya-container flex h-16 items-center justify-between">
          <Link to="/" aria-label="Aretide home">
            <Logo />
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Exit
          </Link>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-1 rounded-r-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 py-10 md:py-16">
        <div className="w-full max-w-xl">
          <p className="text-sm font-medium text-primary">
            Step {step + 1} of {totalSteps} · {STEP_LABELS[step]}
          </p>

          <div className="mt-4 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            {/* STEP 0 — Intent */}
            {step === 0 && (
              <StepShell
                title="Let's see if Aretide is a fit"
                subtitle="A few simple questions — one at a time. No commitment, and you'll see pricing before you pay anything."
              >
                <div className="grid gap-3">
                  <ChoiceCard
                    selected={data.intent === "new"}
                    onClick={() => set("intent", "new")}
                    title="I'm new to weight-loss care"
                    desc="Start fresh with a licensed clinician."
                  />
                  <ChoiceCard
                    selected={data.intent === "switch"}
                    onClick={() => set("intent", "switch")}
                    title="I'm switching from another provider"
                    desc="Transfer your care from Hims, Ro, Noom, a local clinic, and more."
                  />
                </div>
              </StepShell>
            )}

            {/* STEP 1 — State */}
            {step === 1 && (
              <StepShell
                title="Which state are you in?"
                subtitle="We launch state by state and match you with a clinician licensed where you live."
              >
                <select
                  value={data.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select your state…</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {data.state !== "" && stateAvailable && (
                  <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="size-4 text-success" /> Great news —
                    Aretide is available in {data.state}.
                  </p>
                )}

                {waitlist && <Waitlist state={data.state} email={data.email} setEmail={(v) => set("email", v)} />}
              </StepShell>
            )}

            {/* STEP 2 — Profile */}
            {step === 2 && (
              <StepShell
                title="Tell us a little about you"
                subtitle="This helps your clinician understand your starting point."
              >
                <div className="grid gap-4">
                  <Field label="Legal name">
                    <input
                      className={inputCls}
                      value={data.legalName}
                      onChange={(e) => set("legalName", e.target.value)}
                      placeholder="Jordan Avery"
                    />
                  </Field>
                  <Field label="Date of birth">
                    <input
                      type="date"
                      className={inputCls}
                      value={data.dob}
                      onChange={(e) => set("dob", e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Height (ft)">
                      <input
                        type="number"
                        className={inputCls}
                        value={data.heightFt}
                        onChange={(e) => set("heightFt", e.target.value)}
                        placeholder="5"
                      />
                    </Field>
                    <Field label="Height (in)">
                      <input
                        type="number"
                        className={inputCls}
                        value={data.heightIn}
                        onChange={(e) => set("heightIn", e.target.value)}
                        placeholder="8"
                      />
                    </Field>
                    <Field label="Weight (lb)">
                      <input
                        type="number"
                        className={inputCls}
                        value={data.weight}
                        onChange={(e) => set("weight", e.target.value)}
                        placeholder="190"
                      />
                    </Field>
                  </div>
                  {bmi && (
                    <p className="rounded-2xl bg-primary-soft/50 px-4 py-3 text-sm text-foreground">
                      Estimated BMI: <strong>{bmi}</strong>. Your clinician uses
                      this alongside your full history — it's only one part of the
                      picture.
                    </p>
                  )}
                </div>
              </StepShell>
            )}

            {/* STEP 3 — Goals */}
            {step === 3 && (
              <StepShell title="What are you hoping for?" subtitle="Pick all that apply.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {GOALS.map((g) => (
                    <ChoiceCard
                      key={g}
                      compact
                      selected={data.goals.includes(g)}
                      onClick={() => toggleArr("goals", g)}
                      title={g}
                    />
                  ))}
                </div>
              </StepShell>
            )}

            {/* STEP 4 — Prior GLP-1 */}
            {step === 4 && (
              <StepShell
                title="Have you used GLP-1 medication before?"
                subtitle="This includes any weight-management injectable from a previous provider."
              >
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceCard
                    compact
                    selected={data.priorGlp1 === "yes"}
                    onClick={() => set("priorGlp1", "yes")}
                    title="Yes"
                  />
                  <ChoiceCard
                    compact
                    selected={data.priorGlp1 === "no"}
                    onClick={() => set("priorGlp1", "no")}
                    title="No"
                  />
                </div>
                {data.priorGlp1 === "yes" && (
                  <Field label="Medication, dose, last dose date, and why you stopped or are switching" className="mt-4">
                    <textarea
                      className={cn(inputCls, "min-h-28 resize-none")}
                      value={data.priorDetails}
                      onChange={(e) => set("priorDetails", e.target.value)}
                      placeholder="e.g. Semaglutide 0.5mg, last dose 2 weeks ago, switching due to refill delays."
                    />
                  </Field>
                )}
              </StepShell>
            )}

            {/* STEP 5 — Conditions */}
            {step === 5 && (
              <StepShell
                title="Any of these apply to you?"
                subtitle="Some histories affect which treatments are safe. Select all that apply, or none."
              >
                <div className="grid gap-3">
                  {CONDITIONS.map((c) => (
                    <ChoiceCard
                      key={c}
                      compact
                      selected={data.conditions.includes(c)}
                      onClick={() => toggleArr("conditions", c)}
                      title={c}
                    />
                  ))}
                  <p className="mt-1 text-xs text-muted-foreground">
                    If none apply, just continue. Your clinician reviews everything
                    carefully before any decision.
                  </p>
                </div>
              </StepShell>
            )}

            {/* STEP 6 — Insurance & pharmacy */}
            {step === 6 && (
              <StepShell
                title="Insurance & pharmacy"
                subtitle="We'll help you find the cheapest, fastest path — whatever you choose here."
              >
                <p className="text-sm font-medium text-foreground">Do you have health insurance?</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <ChoiceCard compact selected={data.hasInsurance === "yes"} onClick={() => set("hasInsurance", "yes")} title="Yes" />
                  <ChoiceCard compact selected={data.hasInsurance === "no"} onClick={() => set("hasInsurance", "no")} title="No / not sure" />
                </div>
                <p className="mt-5 text-sm font-medium text-foreground">How would you like to get medication?</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {PHARMACY.map((p) => (
                    <ChoiceCard key={p} compact selected={data.pharmacyPref === p} onClick={() => set("pharmacyPref", p)} title={p} />
                  ))}
                </div>
              </StepShell>
            )}

            {/* STEP 7 — Account */}
            {step === 7 && (
              <StepShell
                title="Create your account"
                subtitle="We'll send a secure magic link or one-time code — no password to remember."
              >
                <div className="grid gap-4">
                  <Field label="Email">
                    <input
                      type="email"
                      className={inputCls}
                      value={data.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="you@email.com"
                    />
                  </Field>
                  <Field label="Mobile phone">
                    <input
                      type="tel"
                      className={inputCls}
                      value={data.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </Field>
                  <label className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <input
                      type="checkbox"
                      checked={data.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      className="mt-0.5 size-5 accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-muted-foreground">
                      I consent to receive SMS and email about my care and account,
                      and I understand completing intake does not guarantee a
                      prescription.
                    </span>
                  </label>
                </div>
              </StepShell>
            )}

            {/* STEP 8 — Review */}
            {step === 8 && (
              <StepShell
                title="Your eligibility summary"
                subtitle="Here's what happens next. You'll see your exact charge and next billing date before paying anything."
              >
                <div className="space-y-3">
                  <SummaryRow label="State" value={data.state} />
                  <SummaryRow label="Path" value={data.intent === "switch" ? "Switching provider" : "New to care"} />
                  {bmi && <SummaryRow label="Estimated BMI" value={bmi} />}
                  <SummaryRow label="Goals" value={data.goals.join(", ") || "—"} />
                  <SummaryRow label="Pharmacy preference" value={data.pharmacyPref} />
                </div>

                <div className="mt-5 rounded-2xl bg-primary-soft/40 p-5">
                  <p className="text-sm font-semibold text-foreground">Clear pricing</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Membership</span><span className="font-semibold text-foreground">$79/mo</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Medication</span><span className="text-foreground">shown before charge</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipping / labs</span><span className="text-foreground">billed separately</span></div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Cancel or pause anytime — self-serve. We remind you before every
                    charge.
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  A licensed clinician will independently review your intake. This is
                  not a guarantee of a prescription.
                </div>
              </StepShell>
            )}

            {/* Nav buttons */}
            {!waitlist && (
              <div className="mt-8 flex items-center justify-between gap-3">
                {step > 0 ? (
                  <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                    <ArrowLeft /> Back
                  </Button>
                ) : (
                  <span />
                )}
                {step < totalSteps - 1 ? (
                  <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                    Continue <ArrowRight />
                  </Button>
                ) : (
                  <Button disabled={!canContinue} onClick={() => setSubmitted(true)}>
                    Submit intake <Check />
                  </Button>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your information is protected with encryption and never sold. If this is
            an emergency, call 911.
          </p>
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring";

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ChoiceCard({
  title,
  desc,
  selected,
  onClick,
  compact,
}: {
  title: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left transition-all",
        compact ? "py-3" : "py-4",
        selected
          ? "border-primary bg-primary-soft/50 shadow-soft"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      <span>
        <span className="block text-base font-semibold text-foreground">{title}</span>
        {desc && <span className="mt-0.5 block text-sm text-muted-foreground">{desc}</span>}
      </span>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && <Check className="size-4" />}
      </span>
    </button>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function Waitlist({
  state,
  email,
  setEmail,
}: {
  state: string;
  email: string;
  setEmail: (v: string) => void;
}) {
  const [joined, setJoined] = useState(false);
  return (
    <div className="mt-5 rounded-2xl border border-warning/40 bg-warning/10 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <X className="size-4 text-warning-foreground" /> We're not live in {state} yet
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        We're expanding quickly. Leave your email and we'll let you know the moment
        Aretide launches in {state}.
      </p>
      {joined ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="size-4 text-success" /> You're on the list — thank you!
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className={inputCls}
          />
          <Button onClick={() => setJoined(true)} disabled={!/\S+@\S+\.\S+/.test(email)}>
            Join waitlist
          </Button>
        </div>
      )}
    </div>
  );
}

function Confirmation({ intent }: { intent: Intent | null }) {
  const timeline = [
    { t: "Intake submitted", d: "We've received your information.", done: true },
    { t: "Clinician review", d: "A licensed clinician reviews your intake.", done: false },
    { t: "Possible questions", d: "Your clinician may message you for more detail.", done: false },
    { t: "Prescription routing", d: "If appropriate, routed to your best pharmacy path.", done: false },
    { t: "Pharmacy & refill support", d: "We coordinate and follow through.", done: false },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-grad-hero">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="veya-container flex h-16 items-center">
          <Link to="/" aria-label="Aretide home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-12 md:py-20">
        <div className="w-full max-w-lg text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15">
            <CheckCircle2 className="size-9 text-success" />
          </span>
          <h1 className="mt-6 text-3xl font-bold text-foreground">Your intake is submitted</h1>
          <p className="mt-3 text-muted-foreground">
            {intent === "switch"
              ? "Thanks for switching to Aretide. Here's exactly what happens next."
              : "Thanks for trusting Aretide. Here's exactly what happens next."}
          </p>

          <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-left shadow-soft">
            <ol className="space-y-5">
              {timeline.map((s, i) => (
                <li key={s.t} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full text-xs font-bold",
                        s.done
                          ? "bg-success text-success-foreground"
                          : "border border-border bg-background text-muted-foreground",
                      )}
                    >
                      {s.done ? <Check className="size-4" /> : i + 1}
                    </span>
                    {i < timeline.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-semibold text-foreground">{s.t}</p>
                    <p className="text-sm text-muted-foreground">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Button asChild size="lg" className="mt-8">
            <Link to="/">Back to home</Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            This is a demo flow — no account is created and no charge is made.
          </p>
        </div>
      </main>
    </div>
  );
}

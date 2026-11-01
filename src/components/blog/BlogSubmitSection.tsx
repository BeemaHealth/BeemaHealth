import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, PenLine, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOG_SUBMISSION_LIMITS as LIMITS,
  submitBlogSubmission,
  validateBlogSubmission,
  type BlogSubmissionErrors,
  type BlogSubmissionInput,
} from "@/lib/blog-submission";

const EMPTY: BlogSubmissionInput = {
  name: "",
  email: "",
  title: "",
  body: "",
  bio: "",
  url: "",
  agreed: false,
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  );
}

export function BlogSubmitSection() {
  const [values, setValues] = useState<BlogSubmissionInput>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<BlogSubmissionErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function set<K extends keyof BlogSubmissionInput>(
    key: K,
    value: BlogSubmissionInput[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const found = validateBlogSubmission(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    // Honeypot tripped: pretend success without sending anything.
    if (honeypot) {
      setSent(true);
      return;
    }
    setSending(true);
    const res = await submitBlogSubmission(values);
    setSending(false);
    if (res.ok) {
      setValues(EMPTY);
      setSent(true);
    } else {
      setFormError(res.error);
    }
  }

  return (
    <section
      id="submit"
      aria-labelledby="blog-submit-heading"
      className="scroll-mt-24 pb-16 md:pb-24"
    >
      <div className="veya-container">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-soft md:p-10">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PenLine aria-hidden="true" className="size-5" />
            </span>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Write for us
            </p>
          </div>
          <h2
            id="blog-submit-heading"
            className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
          >
            Submit your own blog post
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            Have something useful to say about weight management, nutrition,
            habits, or making informed treatment decisions? Send it to us. Our
            team reads every submission and decides whether it fits the site. We
            do not guarantee publication, and we may edit for clarity, accuracy,
            and compliance.
          </p>

          {sent ? (
            <div
              role="status"
              className="mt-6 flex gap-3 rounded-2xl border border-border bg-muted/50 p-5"
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-success"
              />
              <div>
                <p className="font-semibold text-foreground">
                  Thanks, we received your post.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  If it looks like a fit, we will email you. You can submit
                  another any time.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSent(false)}
                >
                  Submit another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="blog-name">Your name</Label>
                  <Input
                    id="blog-name"
                    name="name"
                    autoComplete="name"
                    maxLength={LIMITS.name}
                    required
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={
                      errors.name ? "blog-name-error" : undefined
                    }
                    className="mt-1.5"
                  />
                  <FieldError id="blog-name-error" message={errors.name} />
                </div>
                <div>
                  <Label htmlFor="blog-email">Email address</Label>
                  <Input
                    id="blog-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={LIMITS.email}
                    required
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={
                      errors.email ? "blog-email-error" : undefined
                    }
                    className="mt-1.5"
                  />
                  <FieldError id="blog-email-error" message={errors.email} />
                </div>
              </div>

              <div>
                <Label htmlFor="blog-title">Post title</Label>
                <Input
                  id="blog-title"
                  name="title"
                  maxLength={LIMITS.title}
                  required
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={
                    errors.title ? "blog-title-error" : undefined
                  }
                  className="mt-1.5"
                />
                <FieldError id="blog-title-error" message={errors.title} />
              </div>

              <div>
                <Label htmlFor="blog-body">Your post</Label>
                <Textarea
                  id="blog-body"
                  name="body"
                  rows={12}
                  maxLength={LIMITS.body}
                  required
                  value={values.body}
                  onChange={(e) => set("body", e.target.value)}
                  aria-invalid={errors.body ? true : undefined}
                  aria-describedby={
                    errors.body ? "blog-body-error" : "blog-body-hint"
                  }
                  className="mt-1.5"
                />
                <p
                  id="blog-body-hint"
                  className="mt-1.5 text-xs text-muted-foreground"
                >
                  Plain text is fine.{" "}
                  {values.body.length.toLocaleString("en-US")} /{" "}
                  {LIMITS.body.toLocaleString("en-US")} characters.
                </p>
                <FieldError id="blog-body-error" message={errors.body} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="blog-url">
                    Link to a draft or your site (optional)
                  </Label>
                  <Input
                    id="blog-url"
                    name="url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    maxLength={LIMITS.url}
                    placeholder="https://"
                    value={values.url}
                    onChange={(e) => set("url", e.target.value)}
                    aria-invalid={errors.url ? true : undefined}
                    aria-describedby={errors.url ? "blog-url-error" : undefined}
                    className="mt-1.5"
                  />
                  <FieldError id="blog-url-error" message={errors.url} />
                </div>
                <div>
                  <Label htmlFor="blog-bio">Short bio (optional)</Label>
                  <Textarea
                    id="blog-bio"
                    name="bio"
                    rows={2}
                    maxLength={LIMITS.bio}
                    value={values.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    aria-invalid={errors.bio ? true : undefined}
                    aria-describedby={errors.bio ? "blog-bio-error" : undefined}
                    className="mt-1.5"
                  />
                  <FieldError id="blog-bio-error" message={errors.bio} />
                </div>
              </div>

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

              <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">
                    Please do not include personal health information
                  </span>{" "}
                  about yourself or anyone else, such as diagnoses, medications,
                  or lab results tied to a named person. Posts must be your own
                  original work. Do not make medical claims you cannot support,
                  and do not promote other telehealth or pharmacy brands.
                </p>
              </div>

              <div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="blog-agreed"
                    checked={values.agreed}
                    onCheckedChange={(checked) =>
                      set("agreed", checked === true)
                    }
                    aria-invalid={errors.agreed ? true : undefined}
                    aria-describedby={
                      errors.agreed ? "blog-agreed-error" : undefined
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="blog-agreed"
                    className="text-sm font-normal leading-relaxed text-muted-foreground"
                  >
                    This is my original work. I understand Beema Health may
                    review, edit, publish, or decline it, and that submitting
                    does not guarantee publication or payment. I have read the{" "}
                    <Link
                      to="/legal/privacy/"
                      className="underline underline-offset-4"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>
                <FieldError id="blog-agreed-error" message={errors.agreed} />
              </div>

              {formError ? (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" size="lg" disabled={sending}>
                {sending ? "Sending..." : "Submit for review"}
                <Send aria-hidden="true" className="size-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

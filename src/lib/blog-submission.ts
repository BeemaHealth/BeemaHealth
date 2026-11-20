import { isValidEmail, isValidPersonName } from "@/lib/form-validation";

/**
 * "Submit your own blog" form. Posts to Formspree, which emails the submission
 * to Beema Health for editorial review. Nothing is published automatically.
 *
 * Reuses the existing Formspree form (same one the peptide quiz uses);
 * `source` and `_subject` tell submissions apart. Swap the ID here if a
 * dedicated form is created in Formspree.
 *
 * No PHI: the UI tells writers not to include personal health information, and
 * nothing is stored in the browser.
 */
export const BLOG_SUBMISSION_FORMSPREE_ENDPOINT =
  "https://formspree.io/f/xwvgljjr";

export const BLOG_SUBMISSION_LIMITS = {
  email: 254,
  name: 60,
  title: 120,
  body: 20_000,
  bodyMin: 300,
  bio: 500,
  url: 300,
} as const;

const SUBMIT_TIMEOUT_MS = 10_000;

/** ASCII control characters except tab, newline, and carriage return. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export type BlogSubmissionInput = {
  name: string;
  email: string;
  title: string;
  body: string;
  bio: string;
  url: string;
  agreed: boolean;
};

export type BlogSubmissionField = keyof BlogSubmissionInput;
export type BlogSubmissionErrors = Partial<Record<BlogSubmissionField, string>>;

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > BLOG_SUBMISSION_LIMITS.url) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Returns a message per invalid field, or an empty object when valid. */
export function validateBlogSubmission(
  input: BlogSubmissionInput,
): BlogSubmissionErrors {
  const errors: BlogSubmissionErrors = {};
  const L = BLOG_SUBMISSION_LIMITS;

  if (!input.name.trim()) errors.name = "Enter your name.";
  else if (!isValidPersonName(input.name))
    errors.name = "Use letters, spaces, periods, apostrophes, or hyphens only.";

  if (!input.email.trim()) errors.email = "Enter your email address.";
  else if (input.email.trim().length > L.email || !isValidEmail(input.email))
    errors.email = "Enter a valid email address.";

  const title = input.title.trim();
  if (!title) errors.title = "Enter a title for your post.";
  else if (title.length > L.title)
    errors.title = `Keep the title under ${L.title} characters.`;
  else if (CONTROL_CHARS_RE.test(title))
    errors.title = "The title contains unsupported characters.";

  const body = input.body.trim();
  if (!body) errors.body = "Paste your blog post.";
  else if (body.length < L.bodyMin)
    errors.body = `Posts need at least ${L.bodyMin} characters.`;
  else if (body.length > L.body)
    errors.body = `Posts can be up to ${L.body.toLocaleString("en-US")} characters. Include a link to the full draft instead.`;
  else if (CONTROL_CHARS_RE.test(body))
    errors.body = "The post contains unsupported characters.";

  const bio = input.bio.trim();
  if (bio.length > L.bio)
    errors.bio = `Keep your bio under ${L.bio} characters.`;
  else if (CONTROL_CHARS_RE.test(bio))
    errors.bio = "The bio contains unsupported characters.";

  if (input.url.trim() && !isValidHttpUrl(input.url))
    errors.url = "Enter a full link starting with https://";

  if (!input.agreed)
    errors.agreed = "Please confirm the submission terms to continue.";

  return errors;
}

/** Only the form fields and routing keys go out: no UTMs, no identifiers. */
export function buildBlogSubmission(
  input: BlogSubmissionInput,
): Record<string, string> {
  return {
    _subject: `Blog submission: ${input.title.trim()}`,
    source: "blogs/submit",
    name: input.name.trim(),
    email: input.email.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
    bio: input.bio.trim(),
    url: input.url.trim(),
  };
}

export type BlogSubmitResult = { ok: true } | { ok: false; error: string };

export async function submitBlogSubmission(
  input: BlogSubmissionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<BlogSubmitResult> {
  if (Object.keys(validateBlogSubmission(input)).length > 0) {
    return { ok: false, error: "Check the highlighted fields and try again." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(BLOG_SUBMISSION_FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildBlogSubmission(input)),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "We could not send that. Check your connection and try again, or email support@beemahealth.com.",
    };
  } finally {
    clearTimeout(timer);
  }
}

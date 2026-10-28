import { isValidEmail } from "@/lib/form-validation";

/**
 * Formspree form that emails the reader's address to Beema Health. This is the
 * old waitlist form (the waitlist was removed); `source` and `_subject` tell
 * the submissions apart. Quiz answers are health-related and are never sent.
 */
export const QUIZ_FORMSPREE_ENDPOINT = "https://formspree.io/f/xwvgljjr";

const SUBMIT_TIMEOUT_MS = 10_000;
const MAX_EMAIL_LENGTH = 254;

/** Shared email check plus the RFC length cap the shared validator lacks. */
export function isValidQuizEmail(email: string): boolean {
  return email.trim().length <= MAX_EMAIL_LENGTH && isValidEmail(email);
}

/** Only the email and routing fields go out: no answers, UTMs, or identifiers. */
export function buildQuizSubmission(email: string): Record<string, string> {
  return {
    _subject: "Peptide quiz email",
    source: "tools/peptide-quiz",
    email: email.trim(),
  };
}

export type QuizSubmitResult = { ok: true } | { ok: false; error: string };

export async function submitQuizLead(
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<QuizSubmitResult> {
  if (!isValidQuizEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(QUIZ_FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildQuizSubmission(email)),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "We could not send that. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}

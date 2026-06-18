/** Extract a verification token from a pasted link or raw token string. */
export function extractVerificationToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed, window.location.origin);
    return url.searchParams.get("token")?.trim() ?? trimmed;
  } catch {
    return trimmed;
  }
}

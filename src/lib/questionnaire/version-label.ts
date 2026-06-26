/** Helpers for staff questionnaire version label editing. */

export function parseVersionNumber(label: string): number | null {
  const match = /^(\d+(?:\.\d+)?)/.exec(label.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function bumpVersionLabel(label: string, delta: number): string {
  const trimmed = label.trim();
  const parsed = parseVersionNumber(trimmed);
  if (parsed === null) {
    const next = Math.max(1, 1 + delta);
    return String(next).slice(0, 32);
  }
  const nextNum = Math.max(0, parsed + delta);
  const suffix = trimmed.slice(String(parsed).length);
  const next = `${nextNum}${suffix}`.trim();
  return next.slice(0, 32) || String(nextNum).slice(0, 32);
}

export const fmtInt = (n: number | null) =>
  n === null ? "n/a" : n.toLocaleString("en-US");
export const fmtPct = (r: number | null, digits = 1) =>
  r === null ? "n/a" : `${(r * 100).toFixed(digits)}%`;
export const fmtLift = (l: number | null) =>
  l === null ? "n/a" : `${l >= 0 ? "+" : ""}${(l * 100).toFixed(0)}%`;

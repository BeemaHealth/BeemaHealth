import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  PROMO_CODE_DISCOUNT_USD,
  listKnownPricingUsdAmounts,
} from "@/lib/medication-pricing";

/**
 * One price, one place.
 *
 * The failure this guards against is two pages quoting different numbers for
 * the same plan. It happened in the JSON-LD: the semaglutide Offer carried a
 * literal 99/199 while the visible page read from the pricing module, so a
 * price change would have left structured data disagreeing with the page
 * Google was rendering.
 *
 * Rule: any Beema Health price rendered anywhere must be a value the pricing module
 * defines. Third-party figures (branded list prices, gym memberships, grocery
 * costs) are not Beema Health prices and are deliberately out of scope.
 */
const ROOT = resolve(__dirname, "../../..");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "__tests__" ? [] : walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Surfaces that render Beema Health's own commercial pricing. */
const COMMERCIAL_SURFACES = [
  "src/routes/semaglutide.tsx",
  "src/routes/tirzepatide.tsx",
  "src/routes/weight-loss.tsx",
  "src/components/site/Glp1LandingPage.tsx",
  "src/lib/glp-1-landing.ts",
  "src/components/site/CompoundedPriceLockup.tsx",
];

describe("pricing single source of truth", () => {
  it("exposes every Beema Health price through the pricing module", () => {
    const known = listKnownPricingUsdAmounts();
    expect(known.length).toBeGreaterThan(5);
    expect(known).toContain(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd);
    expect(known).toContain(COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd);
    expect(known).toContain(
      COMPOUNDED_TIRZEPATIDE_PRICING.starterPack.monthlyEquivalentUsd,
    );
  });

  it("never hardcodes a Beema Health price on a commercial surface", () => {
    // Beema Health's own price points. A literal here means a second source of truth.
    const beemaPrices = new Set(
      listKnownPricingUsdAmounts().map((n) => String(n)),
    );
    beemaPrices.add(String(PROMO_CODE_DISCOUNT_USD));
    const offenders: string[] = [];
    for (const rel of COMMERCIAL_SURFACES) {
      let source: string;
      try {
        source = readFileSync(resolve(ROOT, rel), "utf-8");
      } catch {
        continue; // surface renamed or removed
      }
      for (const m of source.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) {
        const raw = m[1]!.replace(/,/g, "");
        // Ignore template interpolation like ${formatUsd(...)}
        const before = source.slice(Math.max(0, m.index! - 1), m.index!);
        if (before === "$") continue;
        if (beemaPrices.has(raw)) {
          const line = source.slice(0, m.index).split("\n").length;
          offenders.push(`${rel}:${line} hardcodes $${raw}`);
        }
      }
    }
    expect(
      offenders,
      "import the value from medication-pricing.ts instead of writing it inline",
    ).toEqual([]);
  });

  it("derives structured-data Offer prices from the module", () => {
    // JSON-LD is the surface most likely to drift, because nobody sees it.
    for (const rel of [
      "src/routes/semaglutide.tsx",
      "src/routes/tirzepatide.tsx",
    ]) {
      const source = readFileSync(resolve(ROOT, rel), "utf-8");
      const offer = source.match(/offer:\s*\{[\s\S]*?\}/);
      expect(offer, `${rel} has no Offer block`).not.toBeNull();
      expect(
        offer![0],
        `${rel} Offer uses a literal price rather than the pricing module`,
      ).not.toMatch(/(?:introPrice|recurringPrice):\s*\d/);
    }
  });

  it("keeps semaglutide and tirzepatide priced independently", () => {
    // A copy-paste that pointed both molecules at one constant would silently
    // publish the wrong price for one of them.
    expect(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd).not.toBe(
      COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd,
    );
  });

  it("never lets a stray Beema Health price appear in learn content", () => {
    // Learn articles are plain data and cannot interpolate, so the guard is
    // that any dollar figure they quote is one the module actually defines,
    // or a clearly third-party figure documented in the article's sources.
    const known = new Set(listKnownPricingUsdAmounts().map((n) => String(n)));
    const beemaOnly = [
      String(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd),
      String(COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd),
      String(COMPOUNDED_TIRZEPATIDE_PRICING.starterPack.totalUsd),
    ];
    const files = walk(resolve(ROOT, "src/content/learn"));
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      // Only flag a figure presented as Beema Health's price.
      for (const m of source.matchAll(
        /Beema Health[^.$]{0,120}\$\s?(\d[\d,]*(?:\.\d+)?)/g,
      )) {
        const raw = m[1]!.replace(/,/g, "");
        if (!known.has(raw) && !beemaOnly.includes(raw)) {
          offenders.push(`${file.replace(`${ROOT}/`, "")}: $${raw}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

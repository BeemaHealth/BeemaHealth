import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listAllArticles } from "@/content/learn/registry";
import { MONEY_PAGE_GUIDES } from "@/content/learn/money-page-guides";
import { learnPath } from "@/content/learn/types";

/**
 * Pre-production compliance gate for anything that can receive ad traffic.
 *
 * Three separate rule sets apply and none of them is satisfied by the others:
 *
 * - Google Ads reviews the destination, not just the ad. Copy implying that
 *   medication precedes a provider evaluation, or conflating compounded
 *   product with the FDA-approved brand, is a policy problem on the page.
 * - Meta's Personal Attributes standard rejects copy that tells the reader
 *   something about themselves, and its Health and Wellness rules bar shame
 *   framing and idealized-body content.
 * - LegitScript Standard 5 requires state-availability disclosure, Standard 7
 *   bars implying a prescription before review, Standard 8 bars misleading or
 *   endorsement-implying claims.
 *
 * These run against source copy so a violation fails the build rather than an
 * ad account. They are a safety net, not a substitute for human review.
 */
const ROOT = resolve(__dirname, "../../..");
const articles = listAllArticles();

/** Pages that ads point at, or realistically could. */
const AD_DESTINATIONS = MONEY_PAGE_GUIDES.map((set) => set.path);

function builtPage(path: string): string | null {
  const file = resolve(ROOT, `dist/client${path}index.html`);
  if (!existsSync(file)) return null;
  const html = readFileSync(file, "utf-8");
  const body = html.split("</head>")[1] ?? html;
  return body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * True when a match is a negation or a correction rather than a claim.
 *
 * This copy deliberately names the bad claim in order to refute it: "No
 * guaranteed approval", "should not be assumed identical to branded
 * semaglutide", "not because the drugs melt fat". A naive keyword scan flags
 * exactly the sentences that are doing the compliance work, so every rule
 * below checks the ~60 characters before the match for a negation, and an
 * FAQ question that the answer goes on to correct is treated the same way.
 */
function isNegated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 60), index).toLowerCase();
  return /\b(no|not|never|without|isn't|aren't|won't|will not|cannot|can't|nor|refute|myth)\b[^.]*$/.test(
    before,
  );
}

/** Matches that survive the negation guard. */
function violations(text: string, rules: RegExp[], label: string): string[] {
  const out: string[] = [];
  for (const rule of rules) {
    const rx = new RegExp(
      rule.source,
      rule.flags.includes("g") ? rule.flags : `${rule.flags}g`,
    );
    for (const m of text.matchAll(rx)) {
      if (m.index !== undefined && !isNegated(text, m.index)) {
        out.push(`${label}: ${rule}`);
        break;
      }
    }
  }
  return out;
}

function articleProse(a: (typeof articles)[number]): string {
  return [
    a.title,
    a.h1,
    a.description,
    ...a.sections.flatMap((s) => [s.heading, ...s.body, ...(s.bullets ?? [])]),
    ...a.faqs.flatMap((f) => [f.question, f.answer]),
  ].join("\n");
}

describe("Google Ads destination requirements", () => {
  /**
   * Skipped when dist/ is absent so a clean checkout still passes; CI should
   * build before running if it wants these enforced.
   */
  const pages = AD_DESTINATIONS.map((p) => [p, builtPage(p)] as const).filter(
    (entry): entry is readonly [string, string] => entry[1] !== null,
  );

  it("has a built destination for every mapped ad landing page", () => {
    if (pages.length === 0) return; // dist not built
    expect(pages.map(([p]) => p)).toEqual(AD_DESTINATIONS);
  });

  it("discloses where the service is actually available", () => {
    // LegitScript Standard 5, and a Google destination requirement.
    for (const [path, text] of pages) {
      expect(text, `${path} lacks a state-availability disclosure`).toMatch(
        /all 50 (?:u\.?s\.?\s*)?states|50 states/i,
      );
    }
  });

  it("discloses price before any charge", () => {
    for (const [path, text] of pages) {
      expect(text, `${path} shows no price`).toMatch(/\$\d/);
    }
  });

  it("links a privacy policy from every ad destination", () => {
    for (const path of AD_DESTINATIONS) {
      const file = resolve(ROOT, `dist/client${path}index.html`);
      if (!existsSync(file)) continue;
      expect(readFileSync(file, "utf-8"), path).toContain("/legal/privacy");
    }
  });

  it("never implies medication before a provider evaluation", () => {
    // Google sequencing rule and LegitScript Standard 7.
    const banned = [
      /\bguaranteed approval\b/i,
      /\bget your prescription today\b/i,
      /\bprescription guaranteed\b/i,
      /\bapproved in minutes\b/i,
      /\bno doctor (?:visit )?(?:needed|required)\b/i,
      /\bskip the doctor\b/i,
    ];
    const hits = [
      ...pages.flatMap(([path, text]) => violations(text, banned, path)),
      ...articles.flatMap((a) =>
        violations(articleProse(a), banned, learnPath(a.vertical, a.slug)),
      ),
    ];
    expect(hits).toEqual([]);
  });

  it("never conflates compounded product with the FDA-approved brand", () => {
    const banned = [
      /compounded [a-z]+ is fda[- ]approved/i,
      /fda[- ]approved compounded/i,
      /identical to (?:the )?(?:branded|brand[- ]name)/i,
      /generic (?:version of )?(?:ozempic|wegovy|zepbound|mounjaro)/i,
    ];
    const hits = [
      ...pages.flatMap(([path, text]) => violations(text, banned, path)),
      ...articles.flatMap((a) =>
        violations(articleProse(a), banned, learnPath(a.vertical, a.slug)),
      ),
    ];
    expect(hits).toEqual([]);
  });
});

describe("Meta advertising standards on owned copy", () => {
  /**
   * Meta reviews the landing page as well as the creative. Personal Attributes
   * is the standard that rejects the most weight-loss copy: the test is whether
   * a line tells the reader something about themselves.
   */
  const personalAttributes = [
    /\bstruggling with your weight\b/i,
    /\byour bmi (?:may )?qualif/i,
    /\byour (?:belly|body) fat\b/i,
    /\btired of diets\b/i,
    /\byour weight (?:is|has been) holding you back\b/i,
    /\bare you (?:overweight|obese)\b/i,
    /\bembarrassed (?:by|about) your\b/i,
  ];
  const healthAndWellness = [
    /\bbefore and after (?:photo|picture|pic|transformation)/i,
    /\bdream body\b/i,
    /\bideal body\b/i,
    /\bbikini body\b/i,
    /\bproblem areas?\b/i,
    /\btrouble spots\b/i,
  ];
  const misleadingClaims = [
    /\blose \d+\s*(?:lbs|pounds|kg)\b/i,
    /\b\d+ out of \d+ patients\b/i,
    /\bclinically proven to\b/i,
    /\bmelt(?:s)? (?:away )?fat\b/i,
    /\bguaranteed (?:results|weight loss)\b/i,
  ];

  function scan(label: string, rules: RegExp[]) {
    it(`carries no ${label}`, () => {
      const hits = [
        ...AD_DESTINATIONS.flatMap((path) => {
          const text = builtPage(path);
          return text ? violations(text, rules, path) : [];
        }),
        ...articles.flatMap((a) =>
          violations(articleProse(a), rules, learnPath(a.vertical, a.slug)),
        ),
      ];
      expect(hits).toEqual([]);
    });
  }

  scan("Personal Attributes violations", personalAttributes);
  scan("negative self-perception or idealized-body framing", healthAndWellness);
  scan("unsubstantiated outcome claims", misleadingClaims);
});

describe("LegitScript certification claims", () => {
  it("never implies LegitScript endorses or vouches for the product", () => {
    // Allowed: stating certified status. Not allowed: implying endorsement,
    // sponsorship, or that certification speaks to product quality or safety.
    const banned = [
      /legitscript[- ]approved/i,
      /endorsed by legitscript/i,
      /legitscript[- ]?(?:verified|certified) safe/i,
      /legitscript guarantees/i,
      /recommended by legitscript/i,
    ];
    const hits = [
      ...articles.flatMap((a) =>
        violations(articleProse(a), banned, learnPath(a.vertical, a.slug)),
      ),
      ...AD_DESTINATIONS.flatMap((path) => {
        const text = builtPage(path);
        return text ? violations(text, banned, path) : [];
      }),
    ];
    expect(hits).toEqual([]);
  });

  it("never disparages competitors for lacking certification", () => {
    const banned = [
      /competitors (?:are not|aren't) certified/i,
      /unlike (?:other|competing) (?:clinics|telehealth|providers)/i,
      /(?:scam|shady|sketchy) (?:clinics|competitors|providers)/i,
    ];
    const hits = articles.flatMap((a) =>
      violations(articleProse(a), banned, learnPath(a.vertical, a.slug)),
    );
    expect(hits).toEqual([]);
  });
});

describe("editorial standards", () => {
  it("uses no em or en dashes in any published article", () => {
    const offenders = articles
      .filter((a) => /[\u2014\u2013]/.test(articleProse(a)))
      .map((a) => learnPath(a.vertical, a.slug));
    expect(offenders).toEqual([]);
  });

  it("keeps sentence length varied rather than uniformly generated", () => {
    // Machine-generated prose clusters tightly around one sentence length.
    // Real editorial writing does not. This is a smoke test, not a proof.
    const lengths = articles
      .flatMap((a) =>
        a.sections.flatMap((s) => s.body.join(" ").split(/(?<=[.?!])\s+/)),
      )
      .map((s) => s.trim().split(/\s+/).length)
      .filter((n) => n > 1);
    const mean = lengths.reduce((p, q) => p + q, 0) / lengths.length;
    const sd = Math.sqrt(
      lengths.reduce((p, q) => p + (q - mean) ** 2, 0) / lengths.length,
    );
    expect(lengths.length).toBeGreaterThan(500);
    expect(
      sd,
      `sentence-length sd ${sd.toFixed(1)} is suspiciously uniform`,
    ).toBeGreaterThan(4);
  });

  it("states plainly that the unlaunched HRT vertical is not purchasable", () => {
    // Beema Health does not sell menopausal hormone therapy - HRT education must
    // not read as an offer. TRT briefly launched 2026-08-27 as compounded
    // enclomiphene but paused again 2026-08-28 (see the next test - it still
    // must mention enclomiphene educationally, just not as a live offering).
    const inVertical = articles.filter((a) => a.vertical === "hrt");
    expect(inVertical.length).toBeGreaterThan(0);
    for (const a of inVertical) {
      expect(
        articleProse(a),
        `${learnPath(a.vertical, a.slug)} does not say Beema Health has no such program yet`,
      ).toMatch(
        /does not (?:currently )?offer|not a Beema Health product|education(?:al)? only/i,
      );
    }
  });

  it("distinguishes compounded enclomiphene (a related but not currently offered treatment) from the injectable/gel/patch category the TRT vertical educates on", () => {
    const inVertical = articles.filter((a) => a.vertical === "trt");
    expect(inVertical.length).toBeGreaterThan(0);
    for (const a of inVertical) {
      expect(
        articleProse(a),
        `${learnPath(a.vertical, a.slug)} does not mention Beema Health's actual enclomiphene offering`,
      ).toMatch(/enclomiphene/i);
    }
  });
});

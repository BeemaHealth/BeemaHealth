// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import type { LandingVariant } from "@/landing-variants/types";
import {
  BLACK_FRIDAY_OFFERS,
  BLACK_FRIDAY_PRODUCT_OFFERS as P,
  edBfPerPill,
} from "@/landing-variants/template/BlackFriday";

/** Black Friday 2026 drafts render, show the right code, and stay compliant. */
const modules = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v[2-5]-black-friday.tsx",
  { eager: true },
);

const SEMA = BLACK_FRIDAY_OFFERS.semaglutide.code;
const TIRZ = BLACK_FRIDAY_OFFERS.tirzepatide.code;
const MINTS = BLACK_FRIDAY_OFFERS.edMints.code;
const SIL = BLACK_FRIDAY_OFFERS.sildenafil.code;
const TAD = BLACK_FRIDAY_OFFERS.tadalafil.code;
const BPC = [P.bpc157[0].code, P.bpc157[1].code];

const EXPECTED: Record<string, readonly string[]> = {
  "glp-1-houston": [SEMA, TIRZ],
  "semaglutide-houston": [SEMA],
  "tirzepatide-houston": [TIRZ],
  "sildenafil-boston": [SIL],
  "tadalafil-boston": [TAD],
  "ed-mints-boston": [MINTS],
  // Nationwide product pages
  semaglutide: [SEMA],
  tirzepatide: [TIRZ],
  sildenafil: [SIL],
  tadalafil: [TAD],
  "ed-mints": [MINTS],
  "hair-loss-spray-men": [P.hairSprayMen.code],
  "hair-loss-spray-women": [P.hairSprayWomen.code],
  "oral-finasteride": [P.finasteride.code],
  "oral-minoxidil-men": [P.minoxidil.code],
  "oral-minoxidil-women": [P.minoxidil.code],
  "nad-plus": [P.nad.code],
  sermorelin: [P.sermorelin.code],
  "mots-c": [P.motsC.code],
  "ghk-cu": [P.ghkCu.code],
  "bpc-157": BPC,
  "bpc-157-capsules": BPC,
  "bpc-157-tb-500-ghk-cu": BPC,
  // Hubs
  "glp-1": [SEMA, TIRZ],
  "weight-loss": [SEMA, TIRZ],
  ed: [SIL, TAD, MINTS],
  "sexual-health": [SIL, TAD, MINTS],
  "hair-loss": [P.finasteride.code, P.hairSprayMen.code],
  home: [SEMA, TIRZ, MINTS],
};

async function render(variant: LandingVariant): Promise<string> {
  const Page = variant.Component;
  const root = createRootRoute({ component: () => createElement(Page) });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

describe("Black Friday variants", () => {
  it("exists for every CRO page", () => {
    const pages = Object.keys(modules)
      .map((p) => p.split("/").at(-2))
      .sort();
    expect(pages).toEqual(Object.keys(EXPECTED).sort());
  });

  it("uses a variant id equal to its file name", () => {
    for (const [path, mod] of Object.entries(modules)) {
      expect(path.endsWith(`${mod.variant.id}.tsx`)).toBe(true);
    }
  });

  for (const [path, mod] of Object.entries(modules)) {
    const page = path.split("/").at(-2)!;
    it(`${page} renders its code, terms, and no em dashes`, async () => {
      const html = await render(mod.variant);
      for (const code of EXPECTED[page]!) expect(html).toContain(code);
      expect(html).toContain("Black Friday");
      // Pricing audit: no standing-promo pricing may sit beside the offer.
      const text = html.replace(/<[^>]+>/g, " ");
      expect(text).not.toMatch(/sema-off100|Tirz100|first month/i);
      expect(html).not.toContain("—");
      expect(html).not.toMatch(/guaranteed to|free medication/i);
    });
  }

  it("semaglutide pricing box shows the coupon price and never the old code in the box", async () => {
    for (const page of ["semaglutide-houston", "semaglutide"]) {
      const entry = Object.entries(modules).find(([p]) =>
        p.includes(`/${page}/`),
      )!;
      const html = await render(entry[1].variant);
      expect(html).toContain("$297");
      expect(html).toContain("$597");
      expect(html).toContain("$99/mo");
      // The FAQ (shared, also in JSON-LD) still describes the standing code;
      // the pricing box must not.
      expect(html).not.toMatch(/(use|with) code sema-off100/i);
    }
  });

  it("tirzepatide Houston leads with the monthly cost after the code", async () => {
    const entry = Object.entries(modules).find(([p]) =>
      p.includes("/tirzepatide-houston/"),
    )!;
    const html = await render(entry[1].variant);
    expect(html).toContain("$197/mo");
    expect(html).toContain("$591");
  });

  it("oral finasteride and minoxidil are 3-month only: $89 less $20", async () => {
    for (const page of [
      "oral-finasteride",
      "oral-minoxidil-men",
      "oral-minoxidil-women",
    ]) {
      const entry = Object.entries(modules).find(([p]) =>
        p.includes(`/${page}/`),
      )!;
      const text = (await render(entry[1].variant)).replace(/<[^>]+>/g, " ");
      expect(text).toContain("$89");
      expect(text).toContain("$69");
      expect(text).toContain("$23/mo");
    }
  });

  it("keeps the tirzepatide starter pack tab but leads with the deal", async () => {
    const entry = Object.entries(modules).find(([p]) =>
      p.includes("/tirzepatide-houston/"),
    )!;
    const text = (await render(entry[1].variant)).replace(/<[^>]+>/g, " ");
    expect(text).toMatch(/Starter/);
    expect(text).toContain("$197/mo for 3 months");
  });

  it("never says discounted prices recur ('every 3 months', 'billed quarterly')", async () => {
    for (const [, mod] of Object.entries(modules)) {
      const text = (await render(mod.variant))
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        // Regular (undiscounted) "billed every 3 months" wording in shared FAQ
        // answers is fine; a discounted price must say "for 3 months".
        .replace(/billed every 3 months/gi, "");
      expect(text).not.toMatch(/every 3 months|billed quarterly/i);
    }
  });

  it("GLP-1 offers apply to the 3-month plan and discount below the regular total", () => {
    for (const o of [
      BLACK_FRIDAY_OFFERS.semaglutide,
      BLACK_FRIDAY_OFFERS.tirzepatide,
    ]) {
      expect(o.appliesTo).toBe("the 3-month plan");
      expect(o.plans![0]!.dealUsd).toBe(
        o.plans![0]!.regularUsd - o.discountUsd,
      );
    }
  });

  it("sildenafil and tadalafil show the per-pill cost after the code", async () => {
    // $149 / 90 = $1.66 regular, ($149 - $30) / 90 = $1.32 with code.
    expect(edBfPerPill("tadalafil")).toMatchObject({
      regular: "$1.66/pill",
      deal: "$1.32/pill",
    });
    expect(edBfPerPill("sildenafil").deal).toBe("$2.06/pill");
    for (const page of ["tadalafil", "sildenafil", "sexual-health"]) {
      const entry = Object.entries(modules).find(([p]) =>
        p.includes(`/${page}/`),
      )!;
      const text = (await render(entry[1].variant)).replace(/<[^>]+>/g, " ");
      expect(text).toContain(
        page === "sildenafil" ? "$2.06/pill" : "$1.32/pill",
      );
    }
  });
});

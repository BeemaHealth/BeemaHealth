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
import { BLACK_FRIDAY_OFFERS } from "@/landing-variants/template/BlackFriday";

/** Black Friday 2026 drafts render, show the right code, and stay compliant. */
const modules = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v[45]-black-friday.tsx",
  { eager: true },
);

const EXPECTED: Record<string, readonly string[]> = {
  "glp-1-houston": [
    BLACK_FRIDAY_OFFERS.semaglutide.code,
    BLACK_FRIDAY_OFFERS.tirzepatide.code,
  ],
  "semaglutide-houston": [BLACK_FRIDAY_OFFERS.semaglutide.code],
  "tirzepatide-houston": [BLACK_FRIDAY_OFFERS.tirzepatide.code],
  "sildenafil-boston": [BLACK_FRIDAY_OFFERS.sildenafil.code],
  "tadalafil-boston": [BLACK_FRIDAY_OFFERS.tadalafil.code],
  "ed-mints-boston": [BLACK_FRIDAY_OFFERS.edMints.code],
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
  it("exists for all six Houston and Boston pages", () => {
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
      expect(html).not.toContain("—");
      expect(html).not.toMatch(/guaranteed to|free medication/i);
    });
  }

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
});

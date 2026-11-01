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

/**
 * Smoke test for the shared-template variants: each must render end to end
 * and carry the compliance pieces every landing page needs. tsc cannot catch
 * render errors, and drafts are not in the generated registry, so this loads
 * them straight from disk.
 */
const modules = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v3-new-layout.tsx",
  { eager: true },
);

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

describe("new-layout (shared template) variants", () => {
  const entries = Object.entries(modules);

  it("exists for every landing and product page that has a new layout", () => {
    const pages = entries.map(([p]) => p.split("/").at(-2)).sort();
    expect(pages).toEqual(
      [
        "ed-mints",
        "ed-mints-boston",
        "hair-loss-spray-men",
        "hair-loss-spray-women",
        "nad-plus",
        "oral-finasteride",
        "oral-minoxidil-men",
        "oral-minoxidil-women",
        "semaglutide",
        "semaglutide-houston",
        "sermorelin",
        "sildenafil",
        "sildenafil-boston",
        "tadalafil",
        "tadalafil-boston",
        "tirzepatide",
        "tirzepatide-houston",
      ].sort(),
    );
  });

  const NATIONWIDE_PRODUCT_PAGES = [
    "ed-mints",
    "hair-loss-spray-men",
    "hair-loss-spray-women",
    "nad-plus",
    "oral-finasteride",
    "oral-minoxidil-men",
    "oral-minoxidil-women",
    "sermorelin",
    "sildenafil",
    "tadalafil",
  ];

  it.each(
    entries.filter(([p]) =>
      NATIONWIDE_PRODUCT_PAGES.includes(p.split("/").at(-2) ?? ""),
    ),
  )("%s has no Boston or Houston copy", async (_p, mod) => {
    const html = await render(mod.variant);
    expect(html).not.toContain("Boston");
    expect(html).not.toContain("Houston");
  });

  it.each(entries)("%s renders with the required pieces", async (_p, mod) => {
    const html = await render(mod.variant);
    expect(html).toContain("<h1");
    // LegitScript seal, cash-pay and no-charge language.
    expect(html).toContain("static.legitscript.com/seals/");
    expect(html).toMatch(/You won(&#x27;|')t be charged anything/);
    // Cancellation policy link and illustrative-image note.
    expect(html).toContain("/legal/refund");
    expect(html).toContain("Product images are illustrative");
    // Story video claims note only appears under the tirzepatide video.
    if (/\/tirzepatide(-houston)?\//.test(_p)) {
      expect(html).toContain("one person");
    } else {
      expect(html).not.toContain("Individual stories are not typical");
    }
    // Safety section and prescribing disclaimer.
    expect(html).toContain("Safety and important information");
    expect(html).toContain("Prescribing is never guaranteed");
    // No em dashes anywhere in shipped copy.
    expect(html).not.toContain("—");
  });
});

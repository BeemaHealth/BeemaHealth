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

  it("exists for the seven Houston, Boston and nationwide pages", () => {
    const pages = entries.map(([p]) => p.split("/").at(-2)).sort();
    expect(pages).toEqual(
      [
        "ed-mints-boston",
        "semaglutide",
        "semaglutide-houston",
        "sildenafil-boston",
        "tadalafil-boston",
        "tirzepatide",
        "tirzepatide-houston",
      ].sort(),
    );
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
    // Founder story disclaimer renders as an info note.
    expect(html).toContain('role="note"');
    // Safety section and prescribing disclaimer.
    expect(html).toContain("Safety and important information");
    expect(html).toContain("Prescribing is never guaranteed");
    // No em dashes anywhere in shipped copy.
    expect(html).not.toContain("—");
  });
});

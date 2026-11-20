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
import { PROMO_EVENTS } from "@/landing-variants/template/BlackFriday";

/**
 * Cyber Monday and Christmas variants wrap the Black Friday variants: same
 * layout, offers and codes, with only the event name and end date swapped.
 * Every page must render the right event name, never "Black Friday", and keep
 * the offer codes.
 */
const bf = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v[0-9]-black-friday.tsx",
  { eager: true },
);
const cm = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v[0-9]-cyber-monday.tsx",
  { eager: true },
);
const xm = import.meta.glob<{ variant: LandingVariant }>(
  "../../landing-variants/*/v[0-9]-christmas.tsx",
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

const pageOf = (p: string) => p.split("/").at(-2)!;
const textOf = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe.each([
  ["cyber-monday", cm],
  ["christmas", xm],
] as const)("%s variants", (eventId, mods) => {
  const ev = PROMO_EVENTS[eventId];

  it("shows the per-pill price after the code on tadalafil, sildenafil and the hub", async () => {
    for (const [page, expected] of [
      ["tadalafil", "$1.32/pill"],
      ["sildenafil", "$2.06/pill"],
      ["sexual-health", "$1.32/pill"],
      ["tadalafil-boston", "$1.32/pill"],
      ["sildenafil-boston", "$2.06/pill"],
    ] as const) {
      const entry = Object.entries(mods).find(([p]) => pageOf(p) === page)!;
      expect(textOf(await render(entry[1].variant))).toContain(expected);
    }
  });

  it("exists for every page that has a Black Friday variant", () => {
    expect(Object.keys(mods).map(pageOf).sort()).toEqual(
      Object.keys(bf).map(pageOf).sort(),
    );
  });

  for (const [path, mod] of Object.entries(mods)) {
    const page = pageOf(path);
    it(`${page}: event name, end date, codes, no Black Friday`, async () => {
      expect(path.endsWith(`${mod.variant.id}.tsx`)).toBe(true);
      const text = textOf(await render(mod.variant));
      const bfHtml = textOf(
        await render(
          Object.entries(bf).find(([p]) => pageOf(p) === page)![1].variant,
        ),
      );
      expect(text).toContain(ev.name);
      expect(text).not.toMatch(/Black Friday/);
      expect(text).not.toContain("—");
      // Same offers and codes as the Black Friday variant.
      const codes =
        bfHtml.match(/BeemaHealth\w+|BH\d+off\w+|BeemaMOTS\w+/g) ?? [];
      expect(codes.length).toBeGreaterThan(0);
      for (const c of new Set(codes)) expect(text).toContain(c);
    });
  }
});

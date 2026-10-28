// @vitest-environment happy-dom
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<{ name: string; params: Record<string, unknown> }> = [];

vi.mock("@/lib/ad-conversions", () => ({
  trackGaEvent: (name: string, params: Record<string, unknown>) => {
    sent.push({ name, params });
    return true;
  },
}));

const A = () => createElement("p", { "data-v": "a" }, "A");
const B = () => createElement("p", { "data-v": "b" }, "B");

let experiments: Record<string, unknown>;
vi.mock("@/landing-variants/experiments.generated", () => ({
  get EXPERIMENTS() {
    return experiments;
  },
}));

const split = {
  experimentId: "p-e1",
  variants: [
    { variant: { id: "v1-a", label: "A", Component: A }, weight: 50 },
    { variant: { id: "v2-b", label: "B", Component: B }, weight: 50 },
  ],
};
const single = { experimentId: "p-e1", variants: [split.variants[0]] };

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function installStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
  });
}

const roots: Root[] = [];

async function mount(search: string, hostname = "beemahealth.com") {
  (
    window as unknown as { happyDOM: { setURL: (u: string) => void } }
  ).happyDOM.setURL(`https://${hostname}/p/${search}`);
  const { LandingExperiment } = await import("@/landing-variants/runtime");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  await act(async () => {
    root.render(createElement(LandingExperiment, { page: "p" as never }));
  });
  roots.push(root);
  return { host, root };
}

describe("LandingExperiment", () => {
  beforeEach(() => {
    sent.length = 0;
    installStorage();
    document.body.innerHTML = "";
  });
  afterEach(async () => {
    await act(async () => {
      for (const r of roots.splice(0)) r.unmount();
    });
    vi.restoreAllMocks();
  });

  it("server-renders the default variant hidden in a split test", async () => {
    experiments = { p: split };
    const { LandingExperiment } = await import("@/landing-variants/runtime");
    const html = renderToString(
      createElement(LandingExperiment, { page: "p" as never }),
    );
    expect(html).toContain("exp-pending");
    expect(html).toContain('data-v="a"');
  });

  it("does not hide a single-variant page", async () => {
    experiments = { p: single };
    const { LandingExperiment } = await import("@/landing-variants/runtime");
    const html = renderToString(
      createElement(LandingExperiment, { page: "p" as never }),
    );
    expect(html).not.toContain("exp-pending");
  });

  it("assigns once, reveals, tags exposure, and keeps the visitor's variant", async () => {
    experiments = { p: split };
    vi.spyOn(Math, "random").mockReturnValue(0.9); // -> v2-b
    const first = await mount("");
    expect(first.host.innerHTML).toContain('data-v="b"');
    expect(first.host.firstElementChild?.className).not.toContain(
      "exp-pending",
    );
    expect(sent).toEqual([
      {
        name: "variant_exposure",
        params: {
          experiment_id: "p-e1",
          variant_id: "v2-b",
          landing_page_id: "p",
        },
      },
    ]);
    await act(async () => first.root.unmount());

    vi.spyOn(Math, "random").mockReturnValue(0.1); // would be v1-a
    const second = await mount("");
    expect(second.host.innerHTML).toContain('data-v="b"');
    expect(window.localStorage.getItem("beema_exp:p-e1")).toBe("v2-b");
  });

  it("previews a variant without tracking or storing an assignment", async () => {
    experiments = { p: split };
    const { host } = await mount("?preview_variant=v2-b");
    expect(host.innerHTML).toContain('data-v="b"');
    expect(sent).toHaveLength(0);
    expect(window.localStorage.getItem("beema_exp:p-e1")).toBeNull();
  });

  it("ignores unknown preview ids and still renders", async () => {
    experiments = { p: single };
    const { host } = await mount("?preview_variant=v9-nope");
    expect(host.innerHTML).toContain('data-v="a"');
    expect(sent).toHaveLength(0);
  });

  it("excluded admin browsers see the default and send nothing", async () => {
    experiments = { p: split };
    const { host } = await mount("?exp_exclude=1");
    expect(host.innerHTML).toContain('data-v="a"');
    expect(sent).toHaveLength(0);
    expect(window.localStorage.getItem("beema_exp:p-e1")).toBeNull();
  });

  it("sends nothing from non-production hosts unless ga_debug=1", async () => {
    experiments = { p: single };
    await mount("", "localhost");
    expect(sent).toHaveLength(0);
    await mount("?ga_debug=1", "localhost");
    expect(sent.map((e) => e.name)).toEqual(["variant_exposure"]);
  });

  it("pushes intake_handoff once, tagged with the variant, and sends no direct GA4 hit", async () => {
    experiments = { p: single };
    const { resolveCta, CTA_IDS } = await import("@/lib/cta-ids");
    await mount("");
    sent.length = 0;
    window.dataLayer = [];
    resolveCta(CTA_IDS.tirzepatide_houston_hero).onClick();
    expect(sent).toEqual([]);
    expect(window.dataLayer).toEqual([
      {
        event: "intake_handoff",
        cta_location: "tirzepatide_houston_hero",
        experiment_id: "p-e1",
        variant_id: "v1-a",
        landing_page_id: "p",
      },
    ]);
  });
});

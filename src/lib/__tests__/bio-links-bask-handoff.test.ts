// @vitest-environment happy-dom
/**
 * End-to-end check of the short bio link -> Bask handoff, using the real
 * route tree and a browser history (so window.location updates like it does
 * in production). Simulates the production entry: GitHub Pages serves the SPA
 * shell (404.html) at /instagram, the router redirects client-side, then the
 * app's UTM capture and resolveCta() build the Bask intake link.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BIO_LINK_KEYS, BIO_LINK_PATHS, BIO_LINK_UTMS } from "../bio-links";
import { CTA_IDS, resolveCta } from "../cta-ids";
import { BASK_INTAKE_HOST } from "../gtm";
import { capturePageUtms, clearPendingUtms } from "../utm";
import { getRouter } from "../../router";

async function landOn(pathAndQuery: string) {
  window.history.replaceState(null, "", pathAndQuery);
  const router = getRouter();
  await router.load();
  return router;
}

beforeEach(() => {
  clearPendingUtms();
});
afterEach(() => {
  clearPendingUtms();
  window.history.replaceState(null, "", "/");
});

describe("bio short link -> Bask handoff", () => {
  for (const key of BIO_LINK_KEYS) {
    for (const path of BIO_LINK_PATHS[key]) {
      it(`${path} lands on / with UTMs and they reach the Bask link`, async () => {
        await landOn(path);

        expect(window.location.pathname).toBe("/");
        const here = new URLSearchParams(window.location.search);
        for (const [k, v] of Object.entries(BIO_LINK_UTMS[key])) {
          expect(here.get(k), `${path} address bar ${k}`).toBe(v);
        }

        // What the root effect / trackPageViewed do after mount.
        capturePageUtms();

        const cta = resolveCta(CTA_IDS.home_hero);
        const bask = new URL(cta.to);
        expect(bask.hostname).toBe(BASK_INTAKE_HOST);
        for (const [k, v] of Object.entries(BIO_LINK_UTMS[key])) {
          expect(bask.searchParams.get(k), `${path} Bask ${k}`).toBe(v);
        }
        expect(bask.searchParams.get("cta_id")).toBe(CTA_IDS.home_hero);
      });
    }
  }

  it("carries fbclid from the short link into the Bask link", async () => {
    await landOn("/facebook?fbclid=AbC123");
    capturePageUtms();
    const bask = new URL(resolveCta(CTA_IDS.home_hero).to);
    expect(bask.searchParams.get("fbclid")).toBe("AbC123");
    expect(bask.searchParams.get("utm_source")).toBe("facebook");
  });

  it("keeps the UTMs on Bask links after navigating to another page", async () => {
    const router = await landOn("/instagram");
    capturePageUtms();
    await router.navigate({ to: "/how-it-works" });
    expect(window.location.search).toBe("");
    const bask = new URL(resolveCta(CTA_IDS.footer).to);
    expect(bask.searchParams.get("utm_source")).toBe("instagram");
    expect(bask.searchParams.get("utm_campaign")).toBe("instagram_bio");
  });

  it("does not pick up UTMs when capture runs before the redirect (order-independence)", async () => {
    // Root effect on the 404 shell can fire while still on the short path.
    window.history.replaceState(null, "", "/instagram");
    capturePageUtms();
    const router = getRouter();
    await router.load();
    capturePageUtms();
    const bask = new URL(resolveCta(CTA_IDS.home_hero).to);
    expect(bask.searchParams.get("utm_source")).toBe("instagram");
  });
});

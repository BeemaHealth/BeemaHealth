import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BEE_BODY_SEGMENTS,
  BEE_WING_LEFT_PATH,
  BEE_WING_RIGHT_PATH,
  BOOT_ANIMATION_CATCH_UP_MS,
  BOOT_LOAD_MS_DEFAULT,
  BOOT_LOAD_MS_MAX,
  BOOT_LOAD_MS_MIN,
  BOOT_LOAD_MS_STORAGE_KEY,
  HEX_LOADER_DURATION_SCRIPT,
  HEX_OUTLINE_PATH,
  HEX_OUTLINE_PATH_LENGTH,
  HEX_OUTLINE_VIEWBOX,
  SITE_BOOT_LOADER_ENABLED,
  SITE_BOOT_LOADER_FADE_MS,
  clampBootLoadDurationMs,
  finishRunningAnimations,
  isDocumentLoadComplete,
  isSiteBootLoaderEnabled,
  playbackRateToFinish,
  storeBootLoadMs,
  waitForFontsReady,
  waitForPageReady,
  waitForWindowLoad,
} from "@/lib/site-boot-loader";

const rootRoute = readFileSync(
  resolve(__dirname, "../../routes/__root.tsx"),
  "utf-8",
);
const loaderSrc = readFileSync(
  resolve(__dirname, "../../components/brand/SiteBootLoader.tsx"),
  "utf-8",
);
const stylesSrc = readFileSync(resolve(__dirname, "../../styles.css"), "utf-8");

describe("site boot loader", () => {
  it("stays enabled and fades after the real page is ready, not a fixed delay", () => {
    expect(SITE_BOOT_LOADER_ENABLED).toBe(true);
    expect(SITE_BOOT_LOADER_FADE_MS).toBe(180);
    expect(isSiteBootLoaderEnabled()).toBe(true);
    expect(isSiteBootLoaderEnabled(true)).toBe(true);
    expect(isSiteBootLoaderEnabled(false)).toBe(false);
    expect(isDocumentLoadComplete("complete")).toBe(true);
    expect(isDocumentLoadComplete("loading")).toBe(false);
    expect(isDocumentLoadComplete("interactive")).toBe(false);
    expect(loaderSrc).toContain("waitForPageReady");
    expect(loaderSrc).toContain("finishRunningAnimations");
    expect(loaderSrc).toContain("storeBootLoadMs");
    expect(loaderSrc).not.toContain("SITE_BOOT_LOADER_MS");
  });

  it("paces the draw to the last real load, then catches up if this visit is faster", () => {
    expect(clampBootLoadDurationMs(Number.NaN)).toBe(BOOT_LOAD_MS_DEFAULT);
    expect(clampBootLoadDurationMs(40)).toBe(BOOT_LOAD_MS_MIN);
    expect(clampBootLoadDurationMs(9000)).toBe(BOOT_LOAD_MS_MAX);
    expect(clampBootLoadDurationMs(812.4)).toBe(812);
    expect(
      playbackRateToFinish(500, 2000, BOOT_ANIMATION_CATCH_UP_MS),
    ).toBeCloseTo(1500 / BOOT_ANIMATION_CATCH_UP_MS);
    expect(playbackRateToFinish(1900, 2000, BOOT_ANIMATION_CATCH_UP_MS)).toBe(
      1,
    );
    expect(playbackRateToFinish(0, 0, BOOT_ANIMATION_CATCH_UP_MS)).toBe(1);
    const stored: Record<string, string> = {};
    storeBootLoadMs(640.9, {
      setItem(key, value) {
        stored[key] = value;
      },
    });
    expect(stored[BOOT_LOAD_MS_STORAGE_KEY]).toBe("641");
    expect(HEX_LOADER_DURATION_SCRIPT).toContain(BOOT_LOAD_MS_STORAGE_KEY);
    expect(HEX_LOADER_DURATION_SCRIPT).toContain("--hex-loader-duration");
    expect(HEX_LOADER_DURATION_SCRIPT).not.toMatch(/[\u2014\u2013]/);
  });

  it("speeds in-flight CSS animations so they finish before the overlay fades", async () => {
    const animation = {
      currentTime: 175,
      playbackRate: 1,
      finished: Promise.resolve(),
      effect: {
        getComputedTiming: () => ({ duration: 700 }),
      },
    };
    await finishRunningAnimations(
      {
        getAnimations() {
          return [animation];
        },
      },
      BOOT_ANIMATION_CATCH_UP_MS,
    );
    expect(animation.playbackRate).toBeCloseTo(
      (700 - 175) / BOOT_ANIMATION_CATCH_UP_MS,
    );
    await finishRunningAnimations({});
  });

  it("resolves window load immediately when the document is already complete", async () => {
    await waitForWindowLoad("complete", {
      addEventListener() {
        throw new Error("should not subscribe after load");
      },
    });
  });

  it("waits for the window load event while the document is still loading", async () => {
    let listener: (() => void) | undefined;
    const pending = waitForWindowLoad("interactive", {
      addEventListener(type, next) {
        expect(type).toBe("load");
        listener = next;
      },
    });
    expect(listener).toBeTypeOf("function");
    listener?.();
    await pending;
  });

  it("waits for fonts when the Font Loading API is present", async () => {
    let resolved = false;
    let release: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const waiting = waitForFontsReady({ ready }).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    release();
    await waiting;
    expect(resolved).toBe(true);
    await waitForFontsReady(null);
  });

  it("waits for load, fonts, and the LCP photo before warming the rest", async () => {
    const calls: { url: string; priority?: string }[] = [];
    await waitForPageReady(
      "complete",
      null,
      { ready: Promise.resolve() },
      {
        pathname: "/",
        loadImage: async (url, priority) => {
          calls.push({ url, priority });
        },
      },
    );
    expect(calls[0]?.url).toContain("hero");
    expect(calls[0]?.priority).toBe("high");
    expect(
      calls.some(
        (call) => call.url.includes("tirzepatide") && call.priority === "low",
      ),
    ).toBe(true);
  });

  it("draws a single hexagon outline, not a nested inner+outer pair", () => {
    expect(HEX_OUTLINE_VIEWBOX).toBe("0 0 100 100");
    expect(HEX_OUTLINE_PATH_LENGTH).toBe(6);
    expect(HEX_OUTLINE_PATH.startsWith("M50 ")).toBe(true);
    expect(HEX_OUTLINE_PATH).toContain("L84.38");
    expect(HEX_OUTLINE_PATH).toContain("L15.38");
    expect(loaderSrc).toContain("d={HEX_OUTLINE_PATH}");
    expect(loaderSrc.match(/className="hex-loader-hex"/g)?.length).toBe(1);
    expect(loaderSrc).not.toContain("beema-mark");
    expect(loaderSrc).not.toContain("<img");
  });

  it("draws infinity wings from the center crossing outward", () => {
    expect(BEE_WING_LEFT_PATH.startsWith("M50 48.73")).toBe(true);
    expect(BEE_WING_RIGHT_PATH.startsWith("M50 48.73")).toBe(true);
    expect(loaderSrc).toContain("BEE_WING_LEFT_PATH");
    expect(loaderSrc).toContain("BEE_WING_RIGHT_PATH");
    expect(loaderSrc).toContain("hex-loader-wing");
    expect(loaderSrc).toContain("hex-loader-body");
    expect(BEE_BODY_SEGMENTS).toHaveLength(5);
    expect(BEE_BODY_SEGMENTS.filter((s) => s.tone === "primary")).toHaveLength(
      2,
    );
    expect(BEE_BODY_SEGMENTS.filter((s) => s.tone === "ink")).toHaveLength(3);
  });

  it("wires the overlay into the document shell and hides it without JS", () => {
    expect(rootRoute).toContain("SiteBootLoader");
    expect(rootRoute).toContain("isSiteBootLoaderEnabled()");
    expect(rootRoute).toContain("SITE_CHROME_PRELOAD_LINK");
    expect(rootRoute).toContain(".site-boot-loader{display:none!important}");
  });

  it("uses a status region, brand primary stroke, and no ad-hoc gold", () => {
    expect(loaderSrc).toContain('role="status"');
    expect(loaderSrc).toContain("Loading Beema Health");
    expect(loaderSrc).toContain("text-primary");
    expect(loaderSrc).toContain("text-foreground");
    expect(loaderSrc).toContain("fill-background");
    expect(loaderSrc).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(loaderSrc).not.toMatch(/[\u2014\u2013]/);
  });

  it("sequences wings+hex half, then body+hex half, only when motion is allowed", () => {
    expect(loaderSrc).toContain("hex-loader-wordmark");
    expect(loaderSrc).toContain("hex-loader-wordmark-beema");
    expect(loaderSrc).toContain("hex-loader-wordmark-health");
    expect(stylesSrc).toContain("@keyframes hex-loader-wordmark-beema");
    expect(stylesSrc).toContain("@keyframes hex-loader-wordmark-health");
    expect(stylesSrc).not.toContain("hex-loader-trace");
    expect(loaderSrc).toContain("md:text-6xl");
    expect(stylesSrc).toContain("var(--hex-loader-duration, 520ms)");
    expect(stylesSrc).not.toContain("hex-loader-wings 2s");
    expect(stylesSrc).toContain("prefers-reduced-motion: no-preference");
    expect(stylesSrc).toContain(".site-boot-loader.is-exiting");
    const reducedBlock = stylesSrc.slice(
      stylesSrc.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(reducedBlock).toContain(".site-boot-loader");
    expect(reducedBlock).toContain("transition: none");
  });
});

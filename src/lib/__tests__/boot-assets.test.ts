import { describe, expect, it } from "vitest";
import {
  BOOT_IMAGE_WAIT_MS,
  SITE_CHROME_PRELOAD_LINK,
  bootImagePreloadLinks,
  criticalBootImageUrls,
  normalizeMarketingPath,
  startBootImageWarmup,
  waitForBootImages,
  warmupBootImageUrls,
} from "@/lib/boot-assets";
import { LEGITSCRIPT_SEAL_SRC } from "@/lib/legitscript";
import { resolveVialImagery } from "@/lib/treatment-imagery";

describe("boot image prefetch", () => {
  it("normalizes trailing slashes used on GitHub Pages landings", () => {
    expect(normalizeMarketingPath("/")).toBe("/");
    expect(normalizeMarketingPath("/semaglutide/")).toBe("/semaglutide");
    expect(normalizeMarketingPath("/glp-1-houston/?utm=1")).toBe(
      "/glp-1-houston",
    );
  });

  it("waits only for the homepage LCP hero, then warms other photos at low priority", () => {
    const urls = criticalBootImageUrls("/");
    expect(urls).toEqual([expect.stringContaining("hero")]);
    expect(urls).not.toContain(resolveVialImagery("semaglutide").src);
    expect(urls).not.toContain(LEGITSCRIPT_SEAL_SRC);
    expect(warmupBootImageUrls("/")).toEqual([
      resolveVialImagery("semaglutide").src,
      LEGITSCRIPT_SEAL_SRC,
      resolveVialImagery("tirzepatide").src,
    ]);
  });

  it("does not preload competing product photos on GLP-1 landers", () => {
    for (const path of ["/glp-1", "/glp-1-houston/"]) {
      expect(criticalBootImageUrls(path)).toEqual([]);
      expect(bootImagePreloadLinks(path)).toEqual([]);
      expect(warmupBootImageUrls(path)).toEqual([LEGITSCRIPT_SEAL_SRC]);
    }
  });

  it("waits for the matching vial on compounded treatment landings", () => {
    expect(criticalBootImageUrls("/semaglutide")).toEqual([
      resolveVialImagery("semaglutide").src,
    ]);
    expect(criticalBootImageUrls("/tirzepatide/")).toEqual([
      resolveVialImagery("tirzepatide").src,
    ]);
    expect(criticalBootImageUrls("/weight-loss")).toEqual([]);
    expect(warmupBootImageUrls("/weight-loss")).toEqual([
      resolveVialImagery("semaglutide").src,
      resolveVialImagery("tirzepatide").src,
    ]);
  });

  it("does not block text-only pages on extra image waits", () => {
    expect(criticalBootImageUrls("/contact")).toEqual([]);
    expect(warmupBootImageUrls("/contact")).toEqual([]);
  });

  it("emits image preloads with the first photo marked high priority", () => {
    const links = bootImagePreloadLinks("/");
    expect(links[0]).toMatchObject({
      rel: "preload",
      as: "image",
      fetchPriority: "high",
    });
    expect(links[0]?.href).toContain("hero");
    expect(
      links.some((link) => link.href === SITE_CHROME_PRELOAD_LINK.href),
    ).toBe(false);
    expect(SITE_CHROME_PRELOAD_LINK).toMatchObject({
      rel: "preload",
      as: "image",
    });
    expect(BOOT_IMAGE_WAIT_MS).toBe(4000);
  });

  it("loads critical urls and does not trap the splash on a hung image", async () => {
    const seen: string[] = [];
    await waitForBootImages(["/a.jpg", "/b.jpg"], async (url) => {
      seen.push(url);
    });
    expect(seen).toEqual(["/a.jpg", "/b.jpg"]);

    const warmed: string[] = [];
    startBootImageWarmup("/", async (url) => {
      warmed.push(url);
    });
    expect(warmed).toEqual([
      resolveVialImagery("semaglutide").src,
      LEGITSCRIPT_SEAL_SRC,
      resolveVialImagery("tirzepatide").src,
    ]);

    const started = Date.now();
    await waitForBootImages(
      ["/stuck.jpg"],
      () => new Promise(() => undefined),
      25,
    );
    expect(Date.now() - started).toBeLessThan(250);
  });
});

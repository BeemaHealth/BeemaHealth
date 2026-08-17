/**
 * First-visit photos to fetch while the boot splash is on screen.
 *
 * Google LCP is the largest above-the-fold element. Extra preloads and
 * `Image()` fetches compete with that file, so this module:
 * - waits on the LCP photo only
 * - starts other above-the-fold shots after that file is requested,
 *   at `fetchPriority: "low"`
 *
 * Millisecond load timing only - not PHI.
 */

import beemaMark from "@/assets/beema-mark.png";
import heroImg from "@/assets/hero.jpg";
import { LEGITSCRIPT_SEAL_SRC } from "@/lib/legitscript";
import { resolveVialImagery } from "@/lib/treatment-imagery";

/** Give up waiting so a hung LCP image cannot trap the splash. */
export const BOOT_IMAGE_WAIT_MS = 4000;

export type BootImagePriority = "high" | "low";

export type BootImageLoader = (
  url: string,
  priority?: BootImagePriority,
) => Promise<void>;

export type BootImagePreloadLink = {
  rel: "preload";
  as: "image";
  href: string;
  fetchPriority?: "high";
};

export function normalizeMarketingPath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

function vialSrc(id: "semaglutide" | "tirzepatide"): string {
  return resolveVialImagery(id).src;
}

/**
 * LCP photo for this URL. The splash waits for this file (or
 * BOOT_IMAGE_WAIT_MS). Do not add extra URLs here - they delay Google LCP.
 */
export function criticalBootImageUrls(pathname: string): string[] {
  const path = normalizeMarketingPath(pathname);
  switch (path) {
    case "/":
      return [heroImg];
    case "/semaglutide":
      return [vialSrc("semaglutide")];
    case "/tirzepatide":
      return [vialSrc("tirzepatide")];
    default:
      return [];
  }
}

/**
 * Other first-screen photos. Started after the LCP file, at low priority,
 * so they fill in during the splash without stealing the hero's bandwidth.
 */
export function warmupBootImageUrls(pathname: string): string[] {
  const path = normalizeMarketingPath(pathname);
  const critical = new Set(criticalBootImageUrls(path));
  let extra: string[] = [];
  switch (path) {
    case "/":
      extra = [
        vialSrc("semaglutide"),
        LEGITSCRIPT_SEAL_SRC,
        vialSrc("tirzepatide"),
      ];
      break;
    case "/glp-1":
    case "/glp-1-houston":
      extra = [LEGITSCRIPT_SEAL_SRC];
      break;
    case "/weight-loss":
      extra = [vialSrc("semaglutide"), vialSrc("tirzepatide")];
      break;
    case "/semaglutide":
      extra = [vialSrc("tirzepatide")];
      break;
    case "/tirzepatide":
      extra = [vialSrc("semaglutide")];
      break;
    default:
      extra = [];
  }
  return extra.filter((url) => !critical.has(url));
}

/** `<link rel="preload" as="image">` descriptors for route `head()`. */
export function bootImagePreloadLinks(
  pathname: string,
): BootImagePreloadLink[] {
  return criticalBootImageUrls(pathname)
    .filter((href) => href !== beemaMark)
    .map((href, index) => ({
      rel: "preload" as const,
      as: "image" as const,
      href,
      ...(index === 0 ? { fetchPriority: "high" as const } : {}),
    }));
}

export const SITE_CHROME_PRELOAD_LINK: BootImagePreloadLink = {
  rel: "preload",
  as: "image",
  href: beemaMark,
};

function defaultLoadImage(
  url: string,
  priority: BootImagePriority = "high",
): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.fetchPriority = priority;
    const finish = () => resolve();
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(finish, finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = url;
  });
}

/** Decode the LCP photo, or move on when the timeout elapses. */
export async function waitForBootImages(
  urls: readonly string[],
  loadImage: BootImageLoader = defaultLoadImage,
  timeoutMs: number = BOOT_IMAGE_WAIT_MS,
): Promise<void> {
  if (urls.length === 0) return;
  await Promise.race([
    Promise.all(urls.map((url) => loadImage(url, "high"))),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/** Low-priority photos after the LCP file is already in flight. */
export function startBootImageWarmup(
  pathname: string,
  loadImage: BootImageLoader = defaultLoadImage,
): void {
  for (const url of warmupBootImageUrls(pathname)) {
    void loadImage(url, "low");
  }
}

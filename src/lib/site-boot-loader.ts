/**
 * First-paint splash for Google → marketing-site document loads.
 *
 * Bask already shows its own loader on the marketing-site → intake hop.
 * This covers the missing hop: the visitor lands on Beema with no branded
 * loading mark.
 *
 * Geometry is traced from the glossy Beema mark (square, one rounded
 * hexagon, infinity wings, glossy head, five tapered abdomen segments).
 *
 * The mark draws in two beats on a single hexagon:
 * 1. Infinity wings (center → out) + first 3 hexagon sides
 * 2. Head, abdomen, and remaining 3 hexagon sides
 *
 * The overlay stays up until the document, webfonts, and above-the-fold
 * photos for this URL are ready. The two-beat draw is paced to that real
 * load (last visit's duration, then a catch-up so the mark always finishes
 * before the fade). Set `SITE_BOOT_LOADER_ENABLED` to false to disable.
 */

import {
  criticalBootImageUrls,
  startBootImageWarmup,
  waitForBootImages,
  type BootImageLoader,
} from "@/lib/boot-assets";

/** First-paint splash. Set to false to skip the overlay entirely. */
export const SITE_BOOT_LOADER_ENABLED = true;

/** Fade-out after the mark has finished drawing. Ignored when disabled. */
export const SITE_BOOT_LOADER_FADE_MS = 180;

/** Last measured navigation-to-ready time. Milliseconds only - not PHI. */
export const BOOT_LOAD_MS_STORAGE_KEY = "beema-boot-load-ms";

export const BOOT_LOAD_MS_DEFAULT = 520;

export const BOOT_LOAD_MS_MIN = 220;

export const BOOT_LOAD_MS_MAX = 2500;

/** When the page is ready mid-draw, finish the remaining mark in this window. */
export const BOOT_ANIMATION_CATCH_UP_MS = 140;

/**
 * Runs in the document head before the overlay paints so the CSS duration
 * matches the last real load instead of a fixed 2s timeline.
 */
export const HEX_LOADER_DURATION_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(BOOT_LOAD_MS_STORAGE_KEY)});
    var ms = parseInt(raw, 10);
    if (!ms || ms < ${BOOT_LOAD_MS_MIN} || ms > ${BOOT_LOAD_MS_MAX}) return;
    document.documentElement.style.setProperty('--hex-loader-duration', ms + 'ms');
  } catch (e) {}
})();
`.trim();

/** Square viewBox matching the glossy mark. */
export const HEX_OUTLINE_VIEWBOX = "0 0 100 100";

/**
 * Pointy-top hexagon along the stroke centerline of the glossy mark.
 * Corners round via stroke-linejoin.
 */
export const HEX_OUTLINE_PATH =
  "M50 8.15L84.38 29.69V70.31L50 91.94L15.38 70.31V29.69Z";

/** One closed outline, 6 sides. First beat draws 3 sides, second beat the rest. */
export const HEX_OUTLINE_PATH_LENGTH = 6;

export const HEX_STROKE_WIDTH = 4.1;

export const WING_STROKE_WIDTH = 4.4;

/**
 * Infinity wings. Each loop starts at the center crossing so a dash draw
 * runs from the neck outward to the wing tip, then back.
 */
export const BEE_WING_LEFT_PATH =
  "M50 48.73C42.65 37.18 20.61 37.18 20.61 48.73C20.61 60.28 42.65 60.28 50 48.73";

export const BEE_WING_RIGHT_PATH =
  "M50 48.73C57.35 37.18 79.39 37.18 79.39 48.73C79.39 60.28 57.35 60.28 50 48.73";

export const BEE_HEAD_PATH =
  "M50 32.8C44.5 32.8 40 35.4 40 39.2C40 42.4 44.2 45.2 50 46.05C55.8 45.2 60 42.4 60 39.2C60 35.4 55.5 32.8 50 32.8Z";

export const BEE_HEAD_HIGHLIGHT = {
  cx: 44.9,
  cy: 35.05,
  rx: 3.15,
  ry: 1.55,
} as const;

export const BEE_ANTENNA_LEFT_PATH = "M43.1 33.15Q38.3 28.2 38.57 26.15";

export const BEE_ANTENNA_RIGHT_PATH = "M56.9 33.15Q61.7 28.2 61.08 26.15";

export const BEE_ANTENNA_BEAD_R = 1.52;

export const BEE_ANTENNA_BEAD_LEFT = { cx: 38.57, cy: 24.22 } as const;

export const BEE_ANTENNA_BEAD_RIGHT = { cx: 61.08, cy: 24.22 } as const;

export type BeeBodyTone = "ink" | "primary";

/** Five tapered abdomen segments, top to stinger: black, yellow, black, yellow, black. */
export const BEE_BODY_SEGMENTS: readonly { d: string; tone: BeeBodyTone }[] = [
  {
    tone: "ink",
    d: "M47.46 57.42L42.58 58.3L39.26 59.47L37.5 60.35L36.72 61.52L36.72 62.4L63.18 62.4L63.28 61.52L62.4 60.35L60.55 59.47L57.13 58.3L52.05 57.42Z",
  },
  {
    tone: "primary",
    d: "M46.88 64.06L42.38 64.94L39.06 66.11L37.5 66.99L37.79 68.16L38.09 69.04L61.91 69.04L62.21 68.16L62.5 66.99L61.04 66.11L57.71 64.94L53.22 64.06Z",
  },
  {
    tone: "ink",
    d: "M47.36 70.61L43.95 71.19L42.09 71.78L39.94 72.66L39.75 73.24L40.04 73.83L59.96 73.83L60.25 73.24L60.06 72.66L57.91 71.78L55.96 71.19L52.73 70.61Z",
  },
  {
    tone: "primary",
    d: "M48.44 74.02L45.02 74.9L46 75.78L46.78 76.37L47.95 77.25L49.02 78.12L50.98 78.12L52.15 77.25L53.32 76.37L54 75.78L54.98 74.9L51.66 74.02Z",
  },
  {
    tone: "ink",
    d: "M44.82 78.91L46 79.79L46.78 80.37L47.75 81.25L48.34 81.84L49.22 82.71L50.78 82.71L51.66 81.84L52.25 81.25L53.22 80.37L54 79.79L55.18 78.91Z",
  },
];

export function isSiteBootLoaderEnabled(
  enabled: boolean = SITE_BOOT_LOADER_ENABLED,
): boolean {
  return enabled;
}

export function isDocumentLoadComplete(
  readyState: DocumentReadyState,
): boolean {
  return readyState === "complete";
}

type LoadTarget = {
  addEventListener(
    type: "load",
    listener: () => void,
    options?: { once: boolean },
  ): void;
};

type FontReadySet = { ready: Promise<unknown> };

/** Resolves when `window` `load` has fired, or immediately if it already has. */
export function waitForWindowLoad(
  readyState: DocumentReadyState = typeof document !== "undefined"
    ? document.readyState
    : "complete",
  target: LoadTarget | null = typeof window !== "undefined" ? window : null,
): Promise<void> {
  if (isDocumentLoadComplete(readyState) || target === null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    target.addEventListener("load", () => resolve(), { once: true });
  });
}

/** Resolves when webfonts are ready, or immediately if Font Loading API is missing. */
export function waitForFontsReady(
  fonts: FontReadySet | null = typeof document !== "undefined"
    ? document.fonts
    : null,
): Promise<void> {
  if (!fonts?.ready) return Promise.resolve();
  return Promise.resolve(fonts.ready).then(() => undefined);
}

type BootReadyOptions = {
  pathname?: string;
  criticalImages?: readonly string[];
  warmup?: boolean;
  loadImage?: BootImageLoader;
};

/** Document load + fonts + first-screen photos for this URL. */
export function waitForPageReady(
  readyState?: DocumentReadyState,
  target?: LoadTarget | null,
  fonts?: FontReadySet | null,
  boot?: BootReadyOptions,
): Promise<void> {
  const pathname =
    boot?.pathname ??
    (typeof location !== "undefined" ? location.pathname : "/");
  const critical = boot?.criticalImages ?? criticalBootImageUrls(pathname);
  return Promise.all([
    waitForWindowLoad(readyState, target),
    waitForFontsReady(fonts),
    waitForBootImages(critical, boot?.loadImage).then(() => {
      if (boot?.warmup !== false) {
        startBootImageWarmup(pathname, boot?.loadImage);
      }
    }),
  ]).then(() => undefined);
}

export function clampBootLoadDurationMs(ms: number): number {
  if (!Number.isFinite(ms)) return BOOT_LOAD_MS_DEFAULT;
  return Math.min(BOOT_LOAD_MS_MAX, Math.max(BOOT_LOAD_MS_MIN, Math.round(ms)));
}

export function storeBootLoadMs(
  ms: number,
  storage: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      BOOT_LOAD_MS_STORAGE_KEY,
      String(clampBootLoadDurationMs(ms)),
    );
  } catch {
    // private mode / blocked storage
  }
}

export function playbackRateToFinish(
  currentTime: number,
  duration: number,
  catchUpMs: number = BOOT_ANIMATION_CATCH_UP_MS,
): number {
  if (!(duration > 0) || !(catchUpMs > 0)) return 1;
  const remaining = Math.max(0, duration - currentTime);
  if (remaining <= catchUpMs) return 1;
  return remaining / catchUpMs;
}

type BootAnimation = {
  currentTime: unknown;
  playbackRate: number;
  finished: Promise<unknown>;
  effect: {
    getComputedTiming: () => { duration?: unknown };
  } | null;
};

/** Speed in-flight CSS draws so they complete, then resolve. */
export async function finishRunningAnimations(
  root: {
    getAnimations?: (options?: { subtree?: boolean }) => BootAnimation[];
  },
  catchUpMs: number = BOOT_ANIMATION_CATCH_UP_MS,
): Promise<void> {
  if (typeof root.getAnimations !== "function") return;
  const animations = root.getAnimations({ subtree: true });
  for (const animation of animations) {
    const durationRaw = animation.effect?.getComputedTiming().duration;
    const duration = typeof durationRaw === "number" ? durationRaw : 0;
    const current =
      typeof animation.currentTime === "number" ? animation.currentTime : 0;
    animation.playbackRate = playbackRateToFinish(current, duration, catchUpMs);
  }
  await Promise.all(
    animations.map((animation) =>
      Promise.resolve(animation.finished).then(
        () => undefined,
        () => undefined,
      ),
    ),
  );
}

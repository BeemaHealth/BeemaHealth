import { useEffect, useRef, useState } from "react";
import {
  BEE_ANTENNA_BEAD_LEFT,
  BEE_ANTENNA_BEAD_R,
  BEE_ANTENNA_BEAD_RIGHT,
  BEE_ANTENNA_LEFT_PATH,
  BEE_ANTENNA_RIGHT_PATH,
  BEE_BODY_SEGMENTS,
  BEE_HEAD_HIGHLIGHT,
  BEE_HEAD_PATH,
  BEE_WING_LEFT_PATH,
  BEE_WING_RIGHT_PATH,
  HEX_OUTLINE_PATH,
  HEX_OUTLINE_PATH_LENGTH,
  HEX_OUTLINE_VIEWBOX,
  HEX_STROKE_WIDTH,
  SITE_BOOT_LOADER_FADE_MS,
  WING_STROKE_WIDTH,
  finishRunningAnimations,
  isSiteBootLoaderEnabled,
  storeBootLoadMs,
  waitForPageReady,
} from "@/lib/site-boot-loader";
import { cn } from "@/lib/utils";

function Wing({ d }: { d: string }) {
  return (
    <path
      d={d}
      pathLength={1}
      stroke="currentColor"
      strokeWidth={WING_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hex-loader-wing"
    />
  );
}

/**
 * Glossy Beema mark. Two beats: wings + first 3 hexagon sides, then head
 * and abdomen + remaining 3 sides. One hexagon only.
 */
export function HexLoader({ className }: { className?: string }) {
  return (
    <svg
      viewBox={HEX_OUTLINE_VIEWBOX}
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("h-40 w-auto text-primary", className)}
    >
      <path
        d={HEX_OUTLINE_PATH}
        pathLength={HEX_OUTLINE_PATH_LENGTH}
        stroke="currentColor"
        strokeWidth={HEX_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hex-loader-hex"
      />

      <g className="hex-loader-body">
        <g className="text-foreground">
          <path
            d={BEE_ANTENNA_LEFT_PATH}
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d={BEE_ANTENNA_RIGHT_PATH}
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <circle
            cx={BEE_ANTENNA_BEAD_LEFT.cx}
            cy={BEE_ANTENNA_BEAD_LEFT.cy}
            r={BEE_ANTENNA_BEAD_R}
            fill="currentColor"
          />
          <circle
            cx={BEE_ANTENNA_BEAD_RIGHT.cx}
            cy={BEE_ANTENNA_BEAD_RIGHT.cy}
            r={BEE_ANTENNA_BEAD_R}
            fill="currentColor"
          />
          <path d={BEE_HEAD_PATH} fill="currentColor" />
        </g>
        <ellipse
          cx={BEE_HEAD_HIGHLIGHT.cx}
          cy={BEE_HEAD_HIGHLIGHT.cy}
          rx={BEE_HEAD_HIGHLIGHT.rx}
          ry={BEE_HEAD_HIGHLIGHT.ry}
          className="fill-background"
        />
        {BEE_BODY_SEGMENTS.map((segment) => (
          <path
            key={segment.d}
            d={segment.d}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className={
              segment.tone === "primary" ? "text-primary" : "text-foreground"
            }
          />
        ))}
      </g>

      <Wing d={BEE_WING_LEFT_PATH} />
      <Wing d={BEE_WING_RIGHT_PATH} />
    </svg>
  );
}

/**
 * Full-viewport splash on the first document load (Google → Beema).
 * Does not remount on in-app navigations. Stays until the document and
 * fonts are ready, finishes the mark draw to match that load, then fades.
 * Set `SITE_BOOT_LOADER_ENABLED` to false to remove it.
 */
export function SiteBootLoader() {
  const enabled = isSiteBootLoaderEnabled();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(enabled);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const overlay = overlayRef.current;
    void waitForPageReady()
      .then(async () => {
        storeBootLoadMs(performance.now());
        if (overlay) await finishRunningAnimations(overlay);
      })
      .then(() => {
        if (!cancelled) setExiting(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!exiting) return undefined;
    const done = window.setTimeout(() => {
      setVisible(false);
    }, SITE_BOOT_LOADER_FADE_MS);
    return () => window.clearTimeout(done);
  }, [exiting]);

  useEffect(() => {
    if (!visible) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      className={cn(
        "site-boot-loader fixed inset-0 z-[80] flex items-center justify-center bg-background",
        exiting && "is-exiting",
      )}
    >
      <span className="sr-only">Loading Beema Health</span>
      <div className="flex flex-col items-center">
        <HexLoader />
        <p
          aria-hidden
          className="hex-loader-wordmark mt-5 text-center font-display text-4xl font-bold leading-none tracking-tight md:mt-8 md:text-6xl"
        >
          <span className="hex-loader-wordmark-beema block text-foreground">
            Beema
          </span>
          <span className="hex-loader-wordmark-health mt-1.5 block text-primary md:mt-2.5">
            Health
          </span>
        </p>
      </div>
    </div>
  );
}

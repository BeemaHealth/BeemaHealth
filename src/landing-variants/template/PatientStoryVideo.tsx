import { useState } from "react";
import { Play } from "lucide-react";
import { PATIENT_STORY_POSTER } from "./story";

/**
 * Click-to-load YouTube embed: no YouTube JS or cookies load until the
 * visitor taps play, which keeps the page fast on mobile.
 */
export function PatientStoryVideo({
  videoId,
  poster = PATIENT_STORY_POSTER,
}: {
  videoId: string;
  poster?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-foreground shadow-lift ring-1 ring-border/60">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`}
          title="Beema Health patient and founder story"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play the Beema Health patient and founder story"
          className="group absolute inset-0 size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={poster}
            alt="Still frame from the Beema Health patient and founder story video"
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-colors group-hover:bg-foreground/30">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform group-hover:scale-105 md:size-20">
              <Play className="size-7 fill-current md:size-8" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

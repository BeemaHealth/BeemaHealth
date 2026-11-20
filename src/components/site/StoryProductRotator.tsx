import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  STORY_PHOTOS,
  storyPhotoPath,
  storyPhotoSrcSet,
} from "@/lib/story-photos";
import { cn } from "@/lib/utils";

const ROTATE_MS = 4500;

/**
 * Crossfades the live treatment photos. Every photo is in the first HTML
 * response with its own alt, width, height, and srcset so image search and
 * Cloudflare can use the stable /images/share-your-story URLs. Motion only
 * changes opacity.
 */
export function StoryProductRotator() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % STORY_PHOTOS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const active = reduceMotion ? 0 : index;

  return (
    <div
      className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift"
      role="region"
      aria-roledescription="carousel"
      aria-label="Beema Health treatment photos"
    >
      {STORY_PHOTOS.map((photo, photoIndex) => {
        const shown = photoIndex === active;
        return (
          <img
            key={photo.slug}
            src={storyPhotoPath(photo)}
            srcSet={storyPhotoSrcSet(photo)}
            sizes="(min-width: 768px) 384px, 80vw"
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading={photoIndex === 0 ? "eager" : "lazy"}
            fetchPriority={photoIndex === 0 ? "high" : "low"}
            decoding="async"
            aria-hidden={shown ? undefined : true}
            className={cn(
              "absolute inset-0 h-full w-full object-contain motion-safe:transition-opacity motion-safe:duration-700",
              shown ? "opacity-100" : "opacity-0",
            )}
          />
        );
      })}
    </div>
  );
}

import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORY_PHOTOS,
  storyPhotoPath,
  storyPhotoSrcSet,
} from "../story-photos";

describe("share-your-story product photos", () => {
  it("rotates weight loss, ED, then NAD, sermorelin, and hair loss", () => {
    expect(STORY_PHOTOS.map((photo) => photo.id)).toEqual([
      "weight-loss",
      "ed",
      "nad",
      "sermorelin",
      "hair-loss",
    ]);
  });

  it("uses stable Cloudflare-cached public WebP paths with real files", () => {
    const directory = resolve(
      __dirname,
      "../../../public/images/share-your-story",
    );
    const expectedNames = STORY_PHOTOS.flatMap((photo) =>
      photo.widths.map((width) => {
        const suffix = width === photo.width ? "" : `-${width}w`;
        return `${photo.slug}${suffix}.webp`;
      }),
    ).sort();

    expect(readdirSync(directory).sort()).toEqual(expectedNames);

    for (const photo of STORY_PHOTOS) {
      expect(photo.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(photo.alt).not.toContain("\u2014");
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.widths.at(-1)).toBe(photo.width);
      expect(storyPhotoPath(photo)).toBe(
        `/images/share-your-story/${photo.slug}.webp`,
      );
      expect(storyPhotoSrcSet(photo)).toContain(
        `${storyPhotoPath(photo)} ${photo.width}w`,
      );
      for (const width of photo.widths) {
        const imagePath = storyPhotoPath(photo, width);
        expect(imagePath.startsWith("/images/share-your-story/")).toBe(true);
        expect(imagePath.endsWith(".webp")).toBe(true);
        const diskPath = resolve(__dirname, `../../../public${imagePath}`);
        expect(existsSync(diskPath), imagePath).toBe(true);
        const size = statSync(diskPath).size;
        expect(size, imagePath).toBeGreaterThan(5_000);
        expect(size, imagePath).toBeLessThan(500_000);
      }
    }
  });
});

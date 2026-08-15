import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARN_GUIDES_IMAGE_ALT,
  LEARN_GUIDES_IMAGE_SLUG,
  LEARN_GUIDES_IMAGE_WIDTHS,
  learnGuidesImagePath,
  learnGuidesImageSrcSet,
} from "../learn-guides-image";

const sectionSrc = readFileSync(
  resolve(__dirname, "../../components/home/FreeResourcesSection.tsx"),
  "utf-8",
);

describe("homepage free educational guides image", () => {
  it("ships responsive WebP files matching the recipe-card width set", () => {
    const imagesDirectory = resolve(__dirname, "../../../public/images/learn");
    const expectedImageNames = LEARN_GUIDES_IMAGE_WIDTHS.map((width) => {
      const suffix = width === 1536 ? "" : `-${width}w`;
      return `${LEARN_GUIDES_IMAGE_SLUG}${suffix}.webp`;
    }).sort();

    expect(readdirSync(imagesDirectory).sort()).toEqual(expectedImageNames);

    for (const width of LEARN_GUIDES_IMAGE_WIDTHS) {
      const imagePath = learnGuidesImagePath(width);
      const diskPath = resolve(__dirname, `../../../public${imagePath}`);
      expect(existsSync(diskPath), imagePath).toBe(true);
      expect(statSync(diskPath).size, imagePath).toBeGreaterThan(5_000);
      expect(statSync(diskPath).size, imagePath).toBeLessThan(500_000);
    }
  });

  it("uses canonical paths and a srcset covering every generated width", () => {
    expect(learnGuidesImagePath()).toBe(
      `/images/learn/${LEARN_GUIDES_IMAGE_SLUG}.webp`,
    );
    expect(learnGuidesImageSrcSet()).toContain(
      `${learnGuidesImagePath(480)} 480w`,
    );
    expect(learnGuidesImageSrcSet()).toContain(
      `${learnGuidesImagePath()} 1536w`,
    );
  });

  it("displays the guides photo the same way as the recipe card", () => {
    expect(sectionSrc).toContain('className="aspect-[16/9]"');
    expect(sectionSrc).toContain("LearnGuidesImage");
    expect(sectionSrc).toContain(
      "overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft",
    );
    expect(LEARN_GUIDES_IMAGE_ALT).toMatch(/library/i);
    expect(LEARN_GUIDES_IMAGE_ALT).toMatch(/fireplace/i);
  });
});

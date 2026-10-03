import { describe, expect, it } from "vitest";
import {
  HERO_BADGE_MESSAGES,
  HERO_MARQUEE_OFFERING_LINE,
  HOME_HERO_ALSO,
  HOME_HERO_INTRO,
  HOME_HERO_OFFERINGS,
} from "@/lib/home-hero";

describe("home hero offerings", () => {
  it("presents weight loss and ED as equal doors", () => {
    expect(HOME_HERO_OFFERINGS.map((offering) => offering.label)).toEqual([
      "Weight loss",
      "ED treatment",
    ]);
    expect(HOME_HERO_OFFERINGS.map((offering) => offering.to)).toEqual([
      "/weight-loss/",
      "/sexual-health/",
    ]);
    expect(HOME_HERO_INTRO).toMatch(/Weight loss/);
    expect(HOME_HERO_INTRO).toMatch(/ED treatment/);
    expect(HOME_HERO_INTRO).toMatch(/hair loss/i);
    expect(HOME_HERO_INTRO).toMatch(/wellness/);
    expect(HOME_HERO_INTRO).toMatch(/never guaranteed/);
    expect(HOME_HERO_ALSO.map((item) => item.label)).toEqual([
      "Hair loss",
      "NAD+",
      "Sermorelin",
    ]);
  });

  it("leads the badge and marquee with both offerings, plus the rest", () => {
    expect(HERO_BADGE_MESSAGES[0]).toBe("Weight loss, ED, and more");
    expect(HERO_MARQUEE_OFFERING_LINE).toBe(
      "Weight loss, ED, hair, and wellness",
    );
  });

  it("does not use em dashes", () => {
    const text = [
      HOME_HERO_INTRO,
      HERO_MARQUEE_OFFERING_LINE,
      ...HERO_BADGE_MESSAGES,
      ...HOME_HERO_OFFERINGS.flatMap((offering) => [
        offering.label,
        offering.detail,
      ]),
      ...HOME_HERO_ALSO.map((item) => item.label),
    ].join(" ");
    expect(text).not.toMatch(/[\u2014\u2013]/);
  });
});

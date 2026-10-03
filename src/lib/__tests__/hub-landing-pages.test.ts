import { describe, expect, it } from "vitest";
import {
  COMPOUNDED_DISCLOSURE,
  COMPOUNDED_ED_MINTS_REQUIRED,
  GENERIC_SILDENAFIL_REQUIRED,
  GENERIC_TADALAFIL_REQUIRED,
} from "@/lib/compounded-disclosure";
import {
  SEXUAL_HEALTH_DESCRIPTION,
  SEXUAL_HEALTH_FAQ,
  SEXUAL_HEALTH_TITLE,
  sexualHealthHead,
} from "@/lib/sexual-health-page";
import {
  WEIGHT_LOSS_DESCRIPTION,
  WEIGHT_LOSS_FAQ,
  WEIGHT_LOSS_TITLE,
  weightLossHead,
} from "@/lib/weight-loss-page";

function jsonLd(head: { scripts: { children: string }[] }) {
  return head.scripts.map(
    (script) =>
      JSON.parse(script.children) as {
        "@type"?: string;
        reviewedBy?: unknown;
        mainEntity?: { name: string }[];
      },
  );
}

describe("weight-loss hub SEO", () => {
  const head = weightLossHead();
  const blocks = jsonLd(head);

  it("uses a distinct medical-weight-loss title and a short description", () => {
    expect(WEIGHT_LOSS_TITLE).toBe("Online Medical Weight Loss | Beema Health");
    expect(WEIGHT_LOSS_TITLE).not.toMatch(/GLP-1/);
    expect(WEIGHT_LOSS_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(WEIGHT_LOSS_DESCRIPTION).toMatch(/50 states/);
    expect(WEIGHT_LOSS_DESCRIPTION).toMatch(/never guaranteed/i);
    expect(head.links[0]).toMatchObject({
      rel: "canonical",
      href: "https://beemahealth.com/weight-loss/",
    });
    expect(head.links[1]).toMatchObject({
      rel: "preload",
      as: "image",
      fetchPriority: "high",
    });
  });

  it("pairs a visible FAQ with FAQPage markup and does not claim medical review", () => {
    const faq = blocks.find((block) => block["@type"] === "FAQPage");
    const service = blocks.find((block) => block["@type"] === "Service");
    expect(faq?.mainEntity?.map((item) => item.name)).toEqual(
      WEIGHT_LOSS_FAQ.map((item) => item.q),
    );
    expect(service).toBeDefined();
    expect(service?.reviewedBy).toBeUndefined();
    expect(WEIGHT_LOSS_FAQ.map((item) => item.a).join(" ")).toContain(
      COMPOUNDED_DISCLOSURE,
    );
    const text = [
      WEIGHT_LOSS_TITLE,
      WEIGHT_LOSS_DESCRIPTION,
      ...WEIGHT_LOSS_FAQ.flatMap((item) => [item.q, item.a]),
    ].join(" ");
    expect(text).not.toMatch(/[\u2014\u2013]/);
    expect(text).not.toMatch(/wegovy|zepbound|ozempic|mounjaro/i);
  });
});

describe("sexual-health hub SEO", () => {
  const head = sexualHealthHead();
  const blocks = jsonLd(head);

  it("targets online ED treatment with a short description", () => {
    expect(SEXUAL_HEALTH_TITLE).toBe("Online ED Treatment | Beema Health");
    expect(SEXUAL_HEALTH_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SEXUAL_HEALTH_DESCRIPTION).toMatch(/tadalafil/i);
    expect(SEXUAL_HEALTH_DESCRIPTION).toMatch(/sildenafil/i);
    expect(SEXUAL_HEALTH_DESCRIPTION).toMatch(/ED mints/i);
    expect(SEXUAL_HEALTH_DESCRIPTION).toMatch(/never guaranteed/i);
    expect(head.links[0]).toMatchObject({
      rel: "canonical",
      href: "https://beemahealth.com/sexual-health/",
    });
    expect(head.links[1]).toMatchObject({
      rel: "preload",
      as: "image",
      fetchPriority: "high",
    });
  });

  it("pairs a visible FAQ with FAQPage markup and keeps generic vs compounded accurate", () => {
    const faq = blocks.find((block) => block["@type"] === "FAQPage");
    const service = blocks.find((block) => block["@type"] === "Service");
    expect(faq?.mainEntity?.map((item) => item.name)).toEqual(
      SEXUAL_HEALTH_FAQ.map((item) => item.q),
    );
    expect(service?.reviewedBy).toBeUndefined();
    const answers = SEXUAL_HEALTH_FAQ.map((item) => item.a).join(" ");
    expect(answers).toContain(GENERIC_TADALAFIL_REQUIRED);
    expect(answers).toContain(GENERIC_SILDENAFIL_REQUIRED);
    expect(answers).toContain(COMPOUNDED_ED_MINTS_REQUIRED);
    const text = [
      SEXUAL_HEALTH_TITLE,
      SEXUAL_HEALTH_DESCRIPTION,
      ...SEXUAL_HEALTH_FAQ.flatMap((item) => [item.q, item.a]),
    ].join(" ");
    expect(text).not.toMatch(/[\u2014\u2013]/);
    expect(text).not.toMatch(/compounded tadalafil|compounded sildenafil/i);
  });
});

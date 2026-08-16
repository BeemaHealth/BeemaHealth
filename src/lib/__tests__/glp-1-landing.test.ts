import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalUrl } from "../seo";
import { getGlp1Copy, glp1Head } from "../glp-1-landing";

describe("GLP-1 market landing pages", () => {
  const national = getGlp1Copy("national");
  const houston = getGlp1Copy("houston");
  const nationalHead = glp1Head("national");
  const houstonHead = glp1Head("houston");

  it("keeps distinct self-referencing canonicals", () => {
    expect(canonicalUrl(national.path)).toBe("https://beemahealth.com/glp-1/");
    expect(canonicalUrl(houston.path)).toBe(
      "https://beemahealth.com/glp-1-houston/",
    );
    expect(nationalHead.links).toEqual([
      { rel: "canonical", href: "https://beemahealth.com/glp-1/" },
    ]);
    expect(houstonHead.links).toEqual([
      { rel: "canonical", href: "https://beemahealth.com/glp-1-houston/" },
    ]);
    expect(nationalHead.links[0].href).not.toBe(houstonHead.links[0].href);
  });

  it("does not canonicalize Houston to the national page", () => {
    const houstonCanonical = houstonHead.links[0].href;
    const nationalCanonical = nationalHead.links[0].href;
    expect(houstonCanonical).toBe("https://beemahealth.com/glp-1-houston/");
    expect(nationalCanonical).toBe("https://beemahealth.com/glp-1/");
    expect(houstonCanonical).not.toBe(nationalCanonical);
    expect(houstonHead.meta).toEqual(
      expect.arrayContaining([
        {
          property: "og:url",
          content: "https://beemahealth.com/glp-1-houston/",
        },
      ]),
    );
  });

  it("does not add noindex on either page", () => {
    for (const head of [nationalHead, houstonHead]) {
      const robots = head.meta.filter(
        (tag) => "name" in tag && tag.name === "robots",
      );
      expect(robots).toEqual([]);
    }
  });

  it("uses materially different SEO-facing copy", () => {
    expect(national.title).toBe("Online GLP-1 Weight Loss | Beema Health");
    expect(houston.title).toBe(
      "GLP-1 Weight Loss Care in Houston | Cash-Pay | Beema Health",
    );
    expect(national.title).not.toBe(houston.title);
    expect(national.description).not.toBe(houston.description);
    expect(national.heroTitleLine2).toBe("options");
    expect(houston.heroTitleLine2).toBe("for Houston, online");
    expect(national.heroEyebrow.toLowerCase()).not.toContain("houston");
    expect(houston.heroEyebrow.toLowerCase()).toContain("houston");
    expect(national.faqDescription.toLowerCase()).not.toContain("houston");
    expect(houston.faqDescription.toLowerCase()).toContain("houston");
    expect(national.footerCtaBody.toLowerCase()).not.toContain("houston");
    expect(houston.footerCtaBody.toLowerCase()).toContain("houston");
  });

  it("keeps Houston local signals on the Houston market only", () => {
    expect(houston.servingEyebrow).toBe("Serving Houston");
    expect(houston.servingBody).toContain("Houston");
    expect(houston.faqItems.some((item) => item.q.includes("Houston"))).toBe(
      true,
    );
    expect(national.faqItems.some((item) => item.q.includes("Houston"))).toBe(
      false,
    );
    expect(national.servingEyebrow.toLowerCase()).not.toContain("houston");
  });

  it("reuses the same CTA ids so conversion tracking stays intact", () => {
    const page = readFileSync(
      resolve(__dirname, "../../components/site/Glp1LandingPage.tsx"),
      "utf-8",
    );
    expect(page).toContain("CTA_IDS.glp1_hero");
    expect(page).toContain("CTA_IDS.glp1_mid");
    expect(page).toContain("CTA_IDS.glp1_footer");
    expect(page).toContain('hash="how-it-works"');
    expect(page).not.toContain('to="/how-it-works/"');
  });

  it("tracks Houston page views under a distinct analytics key", () => {
    expect(national.analyticsPage).toBe("glp_1");
    expect(houston.analyticsPage).toBe("glp_1_houston");
  });

  it("wires thin routes to the shared landing component", () => {
    const nationalRoute = readFileSync(
      resolve(__dirname, "../../routes/glp-1.tsx"),
      "utf-8",
    );
    const houstonRoute = readFileSync(
      resolve(__dirname, "../../routes/glp-1-houston.tsx"),
      "utf-8",
    );
    expect(nationalRoute).toContain('createFileRoute("/glp-1")');
    expect(nationalRoute).toContain('<Glp1LandingPage market="national" />');
    expect(nationalRoute).not.toContain("redirect");
    expect(houstonRoute).toContain('createFileRoute("/glp-1-houston")');
    expect(houstonRoute).toContain('<Glp1LandingPage market="houston" />');
    expect(houstonRoute).not.toContain("redirect");
  });

  it("points the homepage Houston link at the Houston route", () => {
    const showcase = readFileSync(
      resolve(__dirname, "../../components/home/TreatmentShowcase.tsx"),
      "utf-8",
    );
    expect(showcase).toContain('to="/glp-1-houston/"');
    expect(showcase).toContain("Explore GLP-1 care for Houston");
    expect(showcase).not.toContain('to="/glp-1/"');
  });
});

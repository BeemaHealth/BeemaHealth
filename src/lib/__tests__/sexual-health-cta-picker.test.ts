import { describe, expect, it } from "vitest";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";

const BASK = "https://q.beemahealth.com/start-online-visit/";

describe("sexual health product picker CTA ids", () => {
  it.each([
    ["sexual_health_tadalafil", "tadalafil"],
    ["sexual_health_sildenafil", "sildenafil"],
    ["sexual_health_ed_mints_rdt", "edmint1"],
    ["sexual_health_ed_mints_odt", "edmint2"],
  ] as const)(
    "%s goes to its own questionnaire and keeps its id",
    (id, slug) => {
      const cta = resolveCta(CTA_IDS[id]);
      const url = new URL(cta.to);
      expect(url.pathname).toBe(`/start-online-visit/${slug}`);
      expect(cta.to.startsWith(BASK)).toBe(true);
      expect(url.searchParams.get("cta_id")).toBe(id);
    },
  );

  it("leaves the existing sexual health Get Started links unchanged", () => {
    expect(new URL(resolveCta(CTA_IDS.sexual_health_hero).to).pathname).toBe(
      "/start-online-visit/tadalafil",
    );
  });
});

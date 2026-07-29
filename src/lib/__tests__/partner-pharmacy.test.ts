import { describe, expect, it } from "vitest";
import {
  PARTNER_PHARMACY_NAME,
  PARTNER_PHARMACY_WEBSITE,
  partnerPharmacyFaqAnswer,
} from "../partner-pharmacy";
import { FAQ_GROUPS } from "../veya-data";

describe("partner pharmacy disclosure", () => {
  it("includes name, address, phone, website, and 50-state note", () => {
    const answer = partnerPharmacyFaqAnswer();
    expect(answer).toContain(PARTNER_PHARMACY_NAME);
    expect(answer).toContain("15600 NW 15th Ave, Suite C");
    expect(answer).toContain("Miami, FL 33169");
    expect(answer).toContain("(888) 958-1382");
    expect(answer).toContain(PARTNER_PHARMACY_WEBSITE);
    expect(answer).toContain("all 50 U.S. states");
    expect(answer).toContain("state-specific pharmacy regulations");
  });

  it("is exposed on the site FAQ under Shipping", () => {
    const shipping = FAQ_GROUPS.find((g) => g.category === "Shipping");
    expect(shipping).toBeDefined();
    const item = shipping!.items.find(
      (i) => i.q === "Who is Beema Health's partner pharmacy?",
    );
    expect(item?.a).toBe(partnerPharmacyFaqAnswer());
  });
});

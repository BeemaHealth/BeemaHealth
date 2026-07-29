import { describe, expect, it } from "vitest";
import {
  CLINICAL_PROVIDER_ADDRESS_LINE1,
  CLINICAL_PROVIDER_ADDRESS_LINE2,
  CLINICAL_PROVIDER_COMPLIANCE_EMAIL,
  CLINICAL_PROVIDER_GROUP,
  CLINICAL_PROVIDER_LEGAL_NAME,
  CLINICAL_PROVIDER_WEBSITE,
  CLINICAL_PROVIDER_WEBSITE_DISPLAY,
  clinicalProviderGroupFaqAnswer,
  SEAN_ARORA_PROVIDER,
  seanAroraFaqAnswer,
} from "../provider-info";
import { FAQ_GROUPS } from "../veya-data";

function hasValidNpiCheckDigit(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;

  const digits = `80840${npi}`.split("").reverse().map(Number);
  const sum = digits.reduce((total, digit, index) => {
    if (index % 2 === 0) return total + digit;
    const doubled = digit * 2;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);

  return sum % 10 === 0;
}

describe("clinical provider disclosure (Option A)", () => {
  it("publishes the Arora Health & Aesthetics, LLC packet fields", () => {
    expect(CLINICAL_PROVIDER_GROUP).toBe("Arora Health & Aesthetics");
    expect(CLINICAL_PROVIDER_LEGAL_NAME).toBe("Arora Health & Aesthetics, LLC");
    expect(CLINICAL_PROVIDER_COMPLIANCE_EMAIL).toBe(
      "medicalcompliance@arorahealthgroup.com",
    );
    expect(CLINICAL_PROVIDER_ADDRESS_LINE1).toBe("300 Lenora Street");
    expect(CLINICAL_PROVIDER_ADDRESS_LINE2).toBe("Seattle, WA 98121");
    expect(CLINICAL_PROVIDER_WEBSITE).toBe("https://www.arora-health.com");
    expect(CLINICAL_PROVIDER_WEBSITE_DISPLAY).toBe("www.arora-health.com");
  });

  it("publishes Dr. Sean Arora's valid individual NPI", () => {
    expect(SEAN_ARORA_PROVIDER.npi).toBe("1841729449");
    expect(hasValidNpiCheckDigit(SEAN_ARORA_PROVIDER.npi)).toBe(true);
    expect(seanAroraFaqAnswer()).toContain("NPI#: 1841729449");
    expect(seanAroraFaqAnswer()).toContain("individual Type 1");
  });

  it("includes the full Option A disclosure in the FAQ answers", () => {
    const groupAnswer = clinicalProviderGroupFaqAnswer();
    expect(groupAnswer).toContain(CLINICAL_PROVIDER_LEGAL_NAME);
    expect(groupAnswer).toContain(
      `${CLINICAL_PROVIDER_ADDRESS_LINE1}, ${CLINICAL_PROVIDER_ADDRESS_LINE2}`,
    );
    expect(groupAnswer).toContain(CLINICAL_PROVIDER_COMPLIANCE_EMAIL);
    expect(groupAnswer).toContain(CLINICAL_PROVIDER_WEBSITE_DISPLAY);
  });

  it("renders the approved provider disclosures in the FAQ data", () => {
    const providerGroup = FAQ_GROUPS.find(
      (group) => group.category === "Clinical providers",
    );

    expect(providerGroup?.items).toEqual([
      {
        q: "Who provides Beema Health's clinical care?",
        a: clinicalProviderGroupFaqAnswer(),
      },
      {
        q: "Who is Dr. Sean Arora?",
        a: seanAroraFaqAnswer(),
      },
    ]);
  });
});

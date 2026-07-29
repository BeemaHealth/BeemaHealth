import { describe, expect, it } from "vitest";
import {
  JURISDICTIONAL_NOTICE_BODY,
  JURISDICTIONAL_NOTICE_TITLE,
} from "@/lib/jurisdictional-notice";
import { FAQ_GROUPS } from "@/lib/veya-data";

describe("jurisdictional-notice", () => {
  it("keeps the compliance title and body fixed", () => {
    expect(JURISDICTIONAL_NOTICE_TITLE).toBe("Jurisdictional Notice");
    expect(JURISDICTIONAL_NOTICE_BODY).toContain(
      "affiliated medical providers are licensed to practice",
    );
    expect(JURISDICTIONAL_NOTICE_BODY).toContain(
      "pharmacy partners are authorized to dispense medications",
    );
    expect(JURISDICTIONAL_NOTICE_BODY).toContain(
      "Availability may vary by state",
    );
  });

  it("surfaces the notice in the Eligibility FAQ answer", () => {
    const eligibility = FAQ_GROUPS.find((g) => g.category === "Eligibility");
    const statesFaq = eligibility?.items.find((i) =>
      i.q.includes("Which states"),
    );
    expect(statesFaq?.a).toContain(JURISDICTIONAL_NOTICE_TITLE);
    expect(statesFaq?.a).toContain(JURISDICTIONAL_NOTICE_BODY);
  });
});

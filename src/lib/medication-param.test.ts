import { describe, expect, it } from "vitest";
import { parseMedicationParam } from "@/lib/medication-param";

describe("parseMedicationParam", () => {
  it("maps known values case-insensitively", () => {
    expect(parseMedicationParam("?med=semaglutide")).toBe("semaglutide");
    expect(parseMedicationParam("?med=TIRZEPATIDE")).toBe("tirzepatide");
    expect(parseMedicationParam("?utm_source=x&med=sema")).toBe("semaglutide");
    expect(parseMedicationParam("?med=tirz")).toBe("tirzepatide");
  });
  it("returns null for missing or hostile values", () => {
    expect(parseMedicationParam("")).toBeNull();
    expect(parseMedicationParam("?med=")).toBeNull();
    expect(parseMedicationParam("?med=ozempic")).toBeNull();
    expect(parseMedicationParam("?med=<script>alert(1)</script>")).toBeNull();
    expect(parseMedicationParam("?med=../../etc/passwd")).toBeNull();
    expect(parseMedicationParam("?med=" + "a".repeat(10000))).toBeNull();
  });
});

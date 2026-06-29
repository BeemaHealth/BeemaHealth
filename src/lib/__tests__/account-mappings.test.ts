import { describe, expect, it } from "vitest";
import {
  defaultAccountMappings,
  parseAccountMappings,
  presetAccountMappings,
  serializeAccountMappings,
} from "@/lib/questionnaire/account-mappings";

describe("account field mappings", () => {
  it("presets backend and beluga targets for signup fields", () => {
    const rows = presetAccountMappings();
    expect(rows).toHaveLength(6);
    expect(rows.find((r) => r.key === "email")).toEqual({
      key: "email",
      label: "Email",
      backend: "register.email",
      beluga: "beluga:email",
    });
    expect(rows.find((r) => r.key === "password")?.beluga).toBe("");
    expect(rows.find((r) => r.key === "confirm_password")?.backend).toBe("");
  });

  it("defaultAccountMappings matches presets", () => {
    expect(defaultAccountMappings()).toEqual(presetAccountMappings());
  });

  it("round-trips mappings through options JSON", () => {
    const mappings = presetAccountMappings().map((row) =>
      row.key === "phone" ? { ...row, beluga: "" } : row,
    );
    const serialized = serializeAccountMappings(mappings);
    const parsed = parseAccountMappings({
      field_type: "account",
      options: serialized,
    });
    expect(parsed.find((r) => r.key === "phone")?.beluga).toBe("");
    expect(parsed.find((r) => r.key === "email")?.backend).toBe(
      "register.email",
    );
  });

  it("returns defaults for non-account fields", () => {
    const parsed = parseAccountMappings({
      field_type: "text",
      options: [{ value: "yes", label: "Yes" }],
    });
    expect(parsed).toEqual(presetAccountMappings());
  });
});

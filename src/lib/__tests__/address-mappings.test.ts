import { describe, expect, it } from "vitest";
import {
  defaultAddressMappings,
  parseAddressMappings,
  presetAddressMappings,
  serializeAddressMappings,
} from "@/lib/questionnaire/address-mappings";

describe("address-mappings", () => {
  it("presets shipping backend targets for medication_preferences", () => {
    const mappings = presetAddressMappings("medication_preferences");
    expect(mappings.find((m) => m.key === "address")?.backend).toBe(
      "intake.medication_preferences.shipping_address",
    );
    expect(mappings.find((m) => m.key === "state")?.beluga).toBe(
      "beluga:state",
    );
  });

  it("presets identity backend targets for home address", () => {
    const mappings = presetAddressMappings("identity");
    expect(mappings.find((m) => m.key === "city")?.backend).toBe(
      "intake.identity.city",
    );
  });

  it("round-trips serialized options on an address_group field", () => {
    const field = {
      field_type: "address_group" as const,
      maps_to_section: "medication_preferences",
      options: serializeAddressMappings(
        defaultAddressMappings("medication_preferences"),
      ),
    };
    const parsed = parseAddressMappings(field);
    expect(parsed.find((m) => m.key === "zip")?.backend).toBe(
      "intake.medication_preferences.shipping_zip",
    );
  });
});

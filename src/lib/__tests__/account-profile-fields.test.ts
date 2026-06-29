import { describe, expect, it } from "vitest";
import type { QuestionnaireFieldSchema } from "@/lib/api/client";
import {
  resolveAccountDemographics,
  resolveShippingAddress,
} from "@/lib/account-profile-fields";
import type { MedicalIntake, PatientProfile, User } from "@/lib/types/mvp";

const user: User = {
  id: "1",
  email: "matt@example.com",
  first_name: "Matt",
  last_name: "Aertker",
  phone: "7195106341",
  dob: "",
  state: "",
  email_verified: true,
  is_staff: false,
  is_provider: false,
  is_patient: true,
  created_at: "2026-01-01",
};

const fields: QuestionnaireFieldSchema[] = [
  {
    field_key: "dob",
    field_type: "dob",
    label: "DOB",
    maps_to_section: "beluga:dob",
  },
  {
    field_key: "sex",
    field_type: "single_choice",
    label: "Sex",
    maps_to_section: "beluga:sex",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
  },
  {
    field_key: "ship",
    field_type: "address_group",
    label: "Address",
    options: [{ value: "state", label: "State", beluga: "beluga:state" }],
  },
];

describe("resolveAccountDemographics", () => {
  it("reads dob, sex, and state from dynamic intake responses", () => {
    const intake = {
      questionnaire_responses: {
        dob: "1990-06-15",
        sex: "male",
        ship: {
          address: "2510 Summit Drive",
          city: "Colorado Springs",
          state: "CO",
          zip: "80909",
          verified: true,
        },
      },
      medication_preferences: {
        shipping_state: "CO",
      },
    } as unknown as MedicalIntake;

    const resolved = resolveAccountDemographics({
      user,
      profile: null,
      eligibility: null,
      intake,
      questionnaireFields: fields,
    });

    expect(resolved.dob).toBe("1990-06-15");
    expect(resolved.sexAtBirth).toBe("male");
    expect(resolved.state).toBe("Colorado");
  });

  it("prefers canonical user fields when already set", () => {
    const resolved = resolveAccountDemographics({
      user: { ...user, dob: "1985-01-01", state: "Texas" },
      profile: { sex_assigned_at_birth: "female" } as never,
      eligibility: null,
      intake: {
        questionnaire_responses: { dob: "1990-06-15", sex: "male" },
      } as unknown as MedicalIntake,
      questionnaireFields: fields,
    });

    expect(resolved.dob).toBe("1985-01-01");
    expect(resolved.state).toBe("Texas");
    expect(resolved.sexAtBirth).toBe("female");
  });
});

describe("resolveShippingAddress", () => {
  it("reads the address from an address_group response", () => {
    const intake = {
      questionnaire_responses: {
        ship: {
          address: "2510 Summit Drive",
          city: "Colorado Springs",
          state: "CO",
          zip: "80909",
          county: "El Paso",
          country: "US",
          verified: true,
        },
      },
    } as unknown as MedicalIntake;

    const resolved = resolveShippingAddress({
      profile: null,
      intake,
      questionnaireFields: fields,
      fallbackState: "Colorado",
    });

    expect(resolved.address).toBe("2510 Summit Drive");
    expect(resolved.city).toBe("Colorado Springs");
    expect(resolved.zip).toBe("80909");
    expect(resolved.county).toBe("El Paso");
  });

  it("falls back to the flattened medication_preferences shipping section", () => {
    const intake = {
      questionnaire_responses: {},
      medication_preferences: {
        shipping_address: "2510 Summit Drive",
        shipping_city: "Colorado Springs",
        shipping_state: "CO",
        shipping_zip: "80909",
        shipping_county: "El Paso",
        shipping_country: "US",
      },
    } as unknown as MedicalIntake;

    const resolved = resolveShippingAddress({
      profile: null,
      intake,
      questionnaireFields: [],
      fallbackState: "Colorado",
    });

    expect(resolved.address).toBe("2510 Summit Drive");
    expect(resolved.city).toBe("Colorado Springs");
    expect(resolved.zip).toBe("80909");
  });

  it("prefers the canonical profile address when present", () => {
    const profile = {
      address: "1 Profile St",
      city: "Denver",
      zip: "80202",
      county: "Denver",
    } as unknown as PatientProfile;

    const intake = {
      questionnaire_responses: {
        ship: { address: "2510 Summit Drive", city: "Colorado Springs" },
      },
    } as unknown as MedicalIntake;

    const resolved = resolveShippingAddress({
      profile,
      intake,
      questionnaireFields: fields,
      fallbackState: "Colorado",
    });

    expect(resolved.address).toBe("1 Profile St");
    expect(resolved.city).toBe("Denver");
  });

  it("returns an empty address when nothing is on file", () => {
    const resolved = resolveShippingAddress({
      profile: null,
      intake: null,
      fallbackState: "Colorado",
    });

    expect(resolved.address).toBe("");
    expect(resolved.state).toBe("Colorado");
  });
});

import type { ParsedUsAddress } from "@/lib/address-validation";

/** Minimal Nominatim result shape used in tests. */
export type NominatimFixture = {
  place_id: number;
  display_name: string;
  class?: string;
  type?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    postcode?: string;
    state?: string;
  };
};

export const VALID_NOMINATIM_RESULTS: NominatimFixture[] = [
  {
    place_id: 1,
    display_name:
      "2510, Summit Drive, Phoenix, Maricopa County, Arizona, 85001, United States",
    class: "building",
    type: "house",
    address: {
      house_number: "2510",
      road: "Summit Drive",
      city: "Phoenix",
      county: "Maricopa County",
      postcode: "85001",
      state: "Arizona",
    },
  },
  {
    place_id: 2,
    display_name:
      "1600, Pennsylvania Avenue NW, Washington, District of Columbia, 20500, United States",
    class: "building",
    type: "house",
    address: {
      house_number: "1600",
      road: "Pennsylvania Avenue NW",
      city: "Washington",
      county: "District of Columbia",
      postcode: "20500",
      state: "District of Columbia",
    },
  },
  {
    place_id: 3,
    display_name:
      "123, Main Street, Tucson, Pima County, Arizona, 85013, United States",
    class: "building",
    type: "residential",
    address: {
      house_number: "123",
      road: "Main Street",
      city: "Denver",
      county: "Pima County",
      postcode: "85013",
      state: "Arizona",
    },
  },
  {
    place_id: 4,
    display_name:
      "500, Oak Ave, Austin, Travis County, Texas, 78701, United States",
    class: "building",
    type: "apartments",
    address: {
      house_number: "500",
      road: "Oak Ave",
      city: "Austin",
      county: "Travis County",
      postcode: "78701",
      state: "Texas",
    },
  },
  {
    place_id: 5,
    display_name: "88, Market St, St. Louis, Missouri, 63101, United States",
    class: "building",
    type: "yes",
    address: {
      house_number: "88",
      road: "Market St",
      town: "St. Louis",
      county: "St. Louis City",
      postcode: "63101",
      state: "Missouri",
    },
  },
];

export const INVALID_NOMINATIM_RESULTS: Array<{
  label: string;
  item: NominatimFixture;
}> = [
  {
    label: "postcode-only",
    item: {
      place_id: 101,
      display_name: "85001, Arizona, United States",
      class: "place",
      type: "postcode",
      address: { postcode: "85001", state: "Arizona" },
    },
  },
  {
    label: "city-only",
    item: {
      place_id: 102,
      display_name: "Phoenix, Arizona, United States",
      class: "place",
      type: "city",
      address: { city: "Phoenix", state: "Arizona" },
    },
  },
  {
    label: "road-without-house-number",
    item: {
      place_id: 103,
      display_name: "Summit Drive, Phoenix, Arizona, United States",
      class: "highway",
      type: "residential",
      address: {
        road: "Summit Drive",
        city: "Phoenix",
        postcode: "85001",
        state: "Arizona",
      },
    },
  },
  {
    label: "missing-zip",
    item: {
      place_id: 104,
      display_name:
        "2510 Summit Drive, Phoenix, Arizona, United States",
      class: "building",
      type: "house",
      address: {
        house_number: "2510",
        road: "Summit Drive",
        city: "Phoenix",
        state: "Arizona",
      },
    },
  },
  {
    label: "administrative-boundary",
    item: {
      place_id: 105,
      display_name: "Maricopa County, Arizona, United States",
      class: "boundary",
      type: "administrative",
      address: { state: "Arizona" },
    },
  },
  {
    label: "incomplete-street-token",
    item: {
      place_id: 106,
      display_name:
        "2510 sum, Phoenix, Arizona, 85001, United States",
      class: "building",
      type: "house",
      address: {
        house_number: "2510",
        road: "sum",
        city: "Phoenix",
        postcode: "85001",
        state: "Arizona",
      },
    },
  },
];

/** Parsed addresses that should pass verifyParsedUsAddress when Zippopotam agrees. */
export const VERIFIABLE_PARSED_ADDRESSES: Array<{
  label: string;
  parsed: ParsedUsAddress;
  accountState: string;
  zippopotam: {
    "post code": string;
    places: { "place name": string; "state abbreviation": string }[];
  };
}> = [
  {
    label: "Phoenix AZ",
    parsed: {
      address: "2510 Oak Drive",
      city: "Phoenix",
      zip: "85001",
      state: "Arizona",
      county: "Maricopa County",
    },
    accountState: "Arizona",
    zippopotam: {
      "post code": "85001",
      places: [
        { "place name": "Phoenix", "state abbreviation": "AZ" },
      ],
    },
  },
  {
    label: "Tucson with AZ abbreviation account state",
    parsed: {
      address: "123 Main Street",
      city: "Tucson",
      zip: "85013",
      state: "Arizona",
      county: "Pima County",
    },
    accountState: "AZ",
    zippopotam: {
      "post code": "85013",
      places: [{ "place name": "Tucson", "state abbreviation": "AZ" }],
    },
  },
  {
    label: "Austin Texas",
    parsed: {
      address: "500 Oak Ave",
      city: "Austin",
      zip: "78701",
      state: "Texas",
      county: "Travis County",
    },
    accountState: "Texas",
    zippopotam: {
      "post code": "78701",
      places: [{ "place name": "Austin", "state abbreviation": "TX" }],
    },
  },
];

/** Parsed addresses that must fail verification. */
export const UNVERIFIABLE_PARSED_ADDRESSES: Array<{
  label: string;
  parsed: ParsedUsAddress;
  accountState: string;
  zippopotam?: {
    "post code": string;
    places: { "place name": string; "state abbreviation": string }[];
  };
  messageMatch: RegExp;
}> = [
  {
    label: "wrong account state",
    parsed: {
      address: "123 Main Street",
      city: "Tucson",
      zip: "85013",
      state: "Arizona",
      county: "Pima County",
    },
    accountState: "Texas",
    messageMatch: /account state is Texas/,
  },
  {
    label: "city and zip mismatch",
    parsed: {
      address: "2510 Summit Drive",
      city: "Boulder",
      zip: "85001",
      state: "Arizona",
      county: "Maricopa County",
    },
    accountState: "Arizona",
    zippopotam: {
      "post code": "85001",
      places: [
        { "place name": "Phoenix", "state abbreviation": "AZ" },
      ],
    },
    messageMatch: /City and ZIP don't match/,
  },
  {
    label: "missing street number",
    parsed: {
      address: "Main Street",
      city: "Tucson",
      zip: "85013",
      state: "Arizona",
      county: "Pima County",
    },
    accountState: "Arizona",
    messageMatch: /complete street address/,
  },
  {
    label: "invalid zip format",
    parsed: {
      address: "123 Main Street",
      city: "Tucson",
      zip: "8501",
      state: "Arizona",
      county: "Pima County",
    },
    accountState: "Arizona",
    messageMatch: /complete street address|valid 5-digit US ZIP/,
  },
  {
    label: "unknown zip",
    parsed: {
      address: "123 Main Street",
      city: "Tucson",
      zip: "99999",
      state: "Arizona",
      county: "Pima County",
    },
    accountState: "Arizona",
    messageMatch: /couldn't find that ZIP|City and ZIP don't match/,
  },
];

export const INVALID_STREET_INPUTS = [
  "Main St",
  "2510 sum",
  "sum",
  "12",
  "<script>alert(1)</script>",
  "' OR 1=1--",
] as const;

export const VALID_STREET_INPUTS = [
  "123 Main St",
  "2510 Summit Drive",
  "1600 Pennsylvania Avenue NW",
  "500 Oak Ave",
] as const;

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
      "2510, Summit Drive, Colorado Springs, El Paso County, Colorado, 80909, United States",
    class: "building",
    type: "house",
    address: {
      house_number: "2510",
      road: "Summit Drive",
      city: "Colorado Springs",
      county: "El Paso County",
      postcode: "80909",
      state: "Colorado",
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
      "123, Main Street, Denver, Denver County, Colorado, 80202, United States",
    class: "building",
    type: "residential",
    address: {
      house_number: "123",
      road: "Main Street",
      city: "Denver",
      county: "Denver County",
      postcode: "80202",
      state: "Colorado",
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
      display_name: "80909, Colorado, United States",
      class: "place",
      type: "postcode",
      address: { postcode: "80909", state: "Colorado" },
    },
  },
  {
    label: "city-only",
    item: {
      place_id: 102,
      display_name: "Colorado Springs, Colorado, United States",
      class: "place",
      type: "city",
      address: { city: "Colorado Springs", state: "Colorado" },
    },
  },
  {
    label: "road-without-house-number",
    item: {
      place_id: 103,
      display_name: "Summit Drive, Colorado Springs, Colorado, United States",
      class: "highway",
      type: "residential",
      address: {
        road: "Summit Drive",
        city: "Colorado Springs",
        postcode: "80909",
        state: "Colorado",
      },
    },
  },
  {
    label: "missing-zip",
    item: {
      place_id: 104,
      display_name:
        "2510 Summit Drive, Colorado Springs, Colorado, United States",
      class: "building",
      type: "house",
      address: {
        house_number: "2510",
        road: "Summit Drive",
        city: "Colorado Springs",
        state: "Colorado",
      },
    },
  },
  {
    label: "administrative-boundary",
    item: {
      place_id: 105,
      display_name: "El Paso County, Colorado, United States",
      class: "boundary",
      type: "administrative",
      address: { state: "Colorado" },
    },
  },
  {
    label: "incomplete-street-token",
    item: {
      place_id: 106,
      display_name:
        "2510 sum, Colorado Springs, Colorado, 80909, United States",
      class: "building",
      type: "house",
      address: {
        house_number: "2510",
        road: "sum",
        city: "Colorado Springs",
        postcode: "80909",
        state: "Colorado",
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
    label: "Colorado Springs CO",
    parsed: {
      address: "2510 Summit Drive",
      city: "Colorado Springs",
      zip: "80909",
      state: "Colorado",
      county: "El Paso County",
    },
    accountState: "Colorado",
    zippopotam: {
      "post code": "80909",
      places: [
        { "place name": "Colorado Springs", "state abbreviation": "CO" },
      ],
    },
  },
  {
    label: "Denver with CO abbreviation account state",
    parsed: {
      address: "123 Main Street",
      city: "Denver",
      zip: "80202",
      state: "Colorado",
      county: "Denver County",
    },
    accountState: "CO",
    zippopotam: {
      "post code": "80202",
      places: [{ "place name": "Denver", "state abbreviation": "CO" }],
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
      city: "Denver",
      zip: "80202",
      state: "Colorado",
      county: "Denver County",
    },
    accountState: "Texas",
    messageMatch: /account state is Texas/,
  },
  {
    label: "city and zip mismatch",
    parsed: {
      address: "2510 Summit Drive",
      city: "Boulder",
      zip: "80909",
      state: "Colorado",
      county: "El Paso County",
    },
    accountState: "Colorado",
    zippopotam: {
      "post code": "80909",
      places: [
        { "place name": "Colorado Springs", "state abbreviation": "CO" },
      ],
    },
    messageMatch: /City and ZIP don't match/,
  },
  {
    label: "missing street number",
    parsed: {
      address: "Main Street",
      city: "Denver",
      zip: "80202",
      state: "Colorado",
      county: "Denver County",
    },
    accountState: "Colorado",
    messageMatch: /complete street address/,
  },
  {
    label: "invalid zip format",
    parsed: {
      address: "123 Main Street",
      city: "Denver",
      zip: "8020",
      state: "Colorado",
      county: "Denver County",
    },
    accountState: "Colorado",
    messageMatch: /complete street address|valid 5-digit US ZIP/,
  },
  {
    label: "unknown zip",
    parsed: {
      address: "123 Main Street",
      city: "Denver",
      zip: "99999",
      state: "Colorado",
      county: "Denver County",
    },
    accountState: "Colorado",
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

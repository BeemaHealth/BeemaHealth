"""US address helpers — mirrors src/lib/address-validation.ts."""

from __future__ import annotations

import re

US_ZIP_RE = re.compile(r"^\d{5}(-\d{4})?$")
STREET_NUMBER_RE = re.compile(r"\d")
UNSAFE_ADDRESS_RE = re.compile(
    r"[<>;|`$]|javascript:|on\w+\s*=|\.\.|%2e%2e|--|\b(drop|union|select|table)\b|script|alert\s*\(",
    re.IGNORECASE,
)
CITY_RE = re.compile(r"^[a-zA-Z .'-]{2,}$")
COUNTY_RE = re.compile(r"^[a-zA-Z .'-]+$")
MAX_COUNTY_LENGTH = 128


def is_valid_us_zip(zip_code: str) -> bool:
    return bool(US_ZIP_RE.match(zip_code.strip()))


def is_valid_street_address(address: str) -> bool:
    trimmed = address.strip()
    if len(trimmed) < 5 or not STREET_NUMBER_RE.search(trimmed):
        return False
    if UNSAFE_ADDRESS_RE.search(trimmed):
        return False
    street_name = re.sub(r"^\d+\s*", "", trimmed)
    if len(street_name) < 4 or not re.search(r"[a-zA-Z]{3,}", street_name):
        return False
    return True


def is_valid_city(city: str) -> bool:
    return bool(CITY_RE.match(city.strip()))


def is_valid_county(county: str) -> bool:
    trimmed = county.strip()
    return (
        2 <= len(trimmed) <= MAX_COUNTY_LENGTH and bool(COUNTY_RE.match(trimmed))
    )


def is_identity_address_complete(identity: dict[str, str]) -> bool:
    county = identity.get("county", "")
    return (
        is_valid_street_address(identity.get("address", ""))
        and is_valid_city(identity.get("city", ""))
        and is_valid_us_zip(identity.get("zip", ""))
        and is_valid_county(county)
        and identity.get("address_verified") == "true"
    )

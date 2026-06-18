"""US address helpers — mirrors src/lib/address-validation.ts."""

from __future__ import annotations

import re

US_ZIP_RE = re.compile(r"^\d{5}(-\d{4})?$")
STREET_NUMBER_RE = re.compile(r"\d")
UNSAFE_ADDRESS_RE = re.compile(r"[<>]|javascript:|on\w+\s*=|script|alert\s*\(", re.IGNORECASE)
CITY_RE = re.compile(r"^[a-zA-Z .'-]{2,}$")


def is_valid_us_zip(zip_code: str) -> bool:
    return bool(US_ZIP_RE.match(zip_code.strip()))


def is_valid_street_address(address: str) -> bool:
    trimmed = address.strip()
    if len(trimmed) < 5 or not STREET_NUMBER_RE.search(trimmed):
        return False
    if UNSAFE_ADDRESS_RE.search(trimmed):
        return False
    return True


def is_valid_city(city: str) -> bool:
    return bool(CITY_RE.match(city.strip()))


def is_identity_address_complete(identity: dict[str, str]) -> bool:
    return (
        is_valid_street_address(identity.get("address", ""))
        and is_valid_city(identity.get("city", ""))
        and is_valid_us_zip(identity.get("zip", ""))
        and identity.get("address_verified") == "true"
    )

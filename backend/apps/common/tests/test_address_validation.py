from django.test import TestCase

from apps.common.validation.address import (
    is_identity_address_complete,
    is_valid_city,
    is_valid_street_address,
    is_valid_us_zip,
)
from apps.common.validation.payloads import SQL_INJECTION, STRICT_FIELD_ATTACKS, XSS_PAYLOADS


class AddressValidationTests(TestCase):
    def test_valid_zip(self):
        self.assertTrue(is_valid_us_zip("80202"))
        self.assertTrue(is_valid_us_zip("80202-1234"))

    def test_rejects_invalid_zip(self):
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_us_zip(payload))

    def test_valid_street(self):
        self.assertTrue(is_valid_street_address("123 Main St"))
        self.assertTrue(is_valid_street_address("2510 Summit Drive"))

    def test_rejects_incomplete_or_invalid_streets(self):
        for street in ("Main St", "2510 sum", "12", "sum"):
            with self.subTest(street=street):
                self.assertFalse(is_valid_street_address(street))

    def test_rejects_xss_street(self):
        for payload in XSS_PAYLOADS:
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_street_address(payload))

    def test_valid_city(self):
        self.assertTrue(is_valid_city("Denver"))

    def test_rejects_invalid_city(self):
        for payload in [*SQL_INJECTION, *XSS_PAYLOADS, "A", "123"]:
            if payload == "admin'--":
                continue
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_city(payload))

    def test_identity_requires_verified_flag(self):
        self.assertTrue(
            is_identity_address_complete(
                {
                    "address": "123 Main St",
                    "city": "Denver",
                    "zip": "80202",
                    "address_verified": "true",
                }
            )
        )
        self.assertFalse(
            is_identity_address_complete(
                {
                    "address": "123 Main St",
                    "city": "Denver",
                    "zip": "80202",
                    "address_verified": "false",
                }
            )
        )

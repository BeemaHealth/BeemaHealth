from django.test import TestCase

from apps.common.validation.address import (
    is_identity_address_complete,
    is_valid_city,
    is_valid_county,
    is_valid_street_address,
    is_valid_us_zip,
)
from apps.common.validation.payloads import OVERFLOW, SQL_INJECTION, STRICT_FIELD_ATTACKS, XSS_PAYLOADS


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

    def test_valid_county(self):
        self.assertTrue(is_valid_county("Denver County"))
        self.assertTrue(is_valid_county("El Paso County"))

    def test_rejects_invalid_county(self):
        for payload in [*SQL_INJECTION, *XSS_PAYLOADS, *OVERFLOW, "A", "123"]:
            if payload == "admin'--":
                continue
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_county(payload))

    def test_rejects_malicious_street(self):
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_street_address(payload))

    def test_rejects_malicious_city(self):
        for payload in STRICT_FIELD_ATTACKS:
            if payload == "admin'--":
                continue
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_city(payload))

    def test_rejects_malicious_zip(self):
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_us_zip(payload))

    def test_identity_requires_verified_flag(self):
        self.assertTrue(
            is_identity_address_complete(
                {
                    "address": "123 Main St",
                    "city": "Denver",
                    "zip": "80202",
                    "county": "Denver County",
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
                    "county": "Denver County",
                    "address_verified": "false",
                }
            )
        )

    def test_identity_rejects_malicious_address_fields(self):
        base = {
            "address": "123 Main St",
            "city": "Denver",
            "zip": "80202",
            "county": "Denver County",
            "address_verified": "true",
        }
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(field="address", payload=payload):
                self.assertFalse(
                    is_identity_address_complete({**base, "address": payload})
                )
            with self.subTest(field="zip", payload=payload):
                self.assertFalse(is_identity_address_complete({**base, "zip": payload}))
            if payload != "admin'--":
                with self.subTest(field="city", payload=payload):
                    self.assertFalse(
                        is_identity_address_complete({**base, "city": payload})
                    )
                with self.subTest(field="county", payload=payload):
                    self.assertFalse(
                        is_identity_address_complete({**base, "county": payload})
                    )

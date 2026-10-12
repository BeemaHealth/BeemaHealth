from django.test import RequestFactory, SimpleTestCase, override_settings

from apps.common.utils import client_ip, normalize_email, normalize_phone, sha256_hex


class UtilsTests(SimpleTestCase):
    def test_normalize_email(self):
        self.assertEqual(normalize_email("  A@B.Com "), "a@b.com")
        self.assertEqual(normalize_email(""), "")

    def test_normalize_phone(self):
        self.assertEqual(normalize_phone("(555) 555-0123"), "+15555550123")
        self.assertEqual(normalize_phone("1 555 555 0123"), "+15555550123")
        self.assertEqual(normalize_phone("+44 20 7946 0958"), "+442079460958")
        for bad in ["", "abc", "123", "+0123456789", "5" * 30, "'; DROP TABLE x;--"]:
            self.assertEqual(normalize_phone(bad), "")

    def test_client_ip(self):
        rf = RequestFactory()
        self.assertIsNone(client_ip(None))
        self.assertEqual(client_ip(rf.get("/", REMOTE_ADDR="1.2.3.4")), "1.2.3.4")
        self.assertEqual(client_ip(rf.get("/", HTTP_X_FORWARDED_FOR="9.9.9.9, 1.1.1.1", REMOTE_ADDR="1.2.3.4")), "1.1.1.1")

    def test_client_ip_ignores_spoofed_leading_hops(self):
        rf = RequestFactory()
        request = rf.get("/", HTTP_X_FORWARDED_FOR="6.6.6.6, 7.7.7.7, 1.1.1.1", REMOTE_ADDR="10.0.0.1")
        self.assertEqual(client_ip(request), "1.1.1.1")
        with override_settings(TRUSTED_PROXY_COUNT=2):
            self.assertEqual(client_ip(request), "7.7.7.7")
        with override_settings(TRUSTED_PROXY_COUNT=0):
            self.assertEqual(client_ip(request), "10.0.0.1")

    def test_sha256(self):
        self.assertEqual(len(sha256_hex("x")), 64)

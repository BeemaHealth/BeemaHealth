from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test import TestCase, override_settings
from cryptography.fernet import Fernet

from apps.accounts.models import User
from apps.common.crypto import PREFIX, EncryptedJSONField, EncryptedTextField, decrypt_text, encrypt_text
from apps.common.exceptions import DecryptionError

KEY_A = Fernet.generate_key().decode()
KEY_B = Fernet.generate_key().decode()


@override_settings(FIELD_ENCRYPTION_KEY=KEY_A)
class CryptoTests(TestCase):
    def test_text_round_trip(self):
        for value in ["hello", "", "unicode: é中\U0001f600", "x" * 10000]:
            self.assertEqual(decrypt_text(encrypt_text(value)), value)

    def test_ciphertext_is_prefixed_and_randomized(self):
        a, b = encrypt_text("same"), encrypt_text("same")
        self.assertTrue(a.startswith(PREFIX))
        self.assertNotEqual(a, b)
        self.assertNotIn("same", a)

    def test_wrong_key_fails(self):
        token = encrypt_text("secret")
        with override_settings(FIELD_ENCRYPTION_KEY=KEY_B):
            with self.assertRaises(DecryptionError):
                decrypt_text(token)

    def test_tampered_token_fails(self):
        token = encrypt_text("secret")
        with self.assertRaises(DecryptionError):
            decrypt_text(token[:-4] + "AAAA")

    def test_plaintext_is_rejected(self):
        with self.assertRaises(DecryptionError):
            decrypt_text("not encrypted")

    def test_error_message_has_no_value(self):
        try:
            decrypt_text(PREFIX + "garbage-value")
        except DecryptionError as exc:
            self.assertNotIn("garbage-value", str(exc))

    def test_key_rotation_old_key_still_decrypts(self):
        old = encrypt_text("rotate me")
        with override_settings(FIELD_ENCRYPTION_KEY=f"{KEY_B},{KEY_A}"):
            self.assertEqual(decrypt_text(old), "rotate me")
            self.assertEqual(decrypt_text(encrypt_text("new")), "new")
        with override_settings(FIELD_ENCRYPTION_KEY=KEY_B):
            with self.assertRaises(DecryptionError):
                decrypt_text(old)

    def test_missing_key_raises_when_not_debug(self):
        with override_settings(FIELD_ENCRYPTION_KEY="", DEBUG=False):
            with self.assertRaises(ImproperlyConfigured):
                encrypt_text("x")

    def test_missing_key_uses_derived_key_in_debug(self):
        with override_settings(FIELD_ENCRYPTION_KEY="", DEBUG=True):
            self.assertEqual(decrypt_text(encrypt_text("dev")), "dev")

    def test_invalid_key_raises(self):
        with override_settings(FIELD_ENCRYPTION_KEY="not-a-key"):
            with self.assertRaises(ImproperlyConfigured):
                encrypt_text("x")

    def test_json_field_round_trip_and_none(self):
        f = EncryptedJSONField()
        value = {"a": [1, 2, {"b": None}], "c": "dé"}
        stored = f.get_prep_value(value)
        self.assertTrue(stored.startswith(PREFIX))
        self.assertEqual(f.from_db_value(stored, None, None), value)
        self.assertIsNone(f.get_prep_value(None))
        self.assertIsNone(f.from_db_value(None, None, None))
        self.assertEqual(f.to_python(stored), value)

    def test_text_field_none(self):
        f = EncryptedTextField()
        self.assertIsNone(f.get_prep_value(None))
        self.assertIsNone(f.from_db_value(None, None, None))

    def test_model_field_encrypted_at_rest(self):
        user = User.objects.create_user("c@example.com", mfa_secret="JBSWY3DPEHPK3PXP")
        with connection.cursor() as cur:
            cur.execute("SELECT mfa_secret FROM accounts_user WHERE email = %s", ["c@example.com"])
            raw = cur.fetchone()[0]
        self.assertTrue(raw.startswith(PREFIX))
        self.assertNotIn("JBSWY3DPEHPK3PXP", raw)
        user.refresh_from_db()
        self.assertEqual(user.mfa_secret, "JBSWY3DPEHPK3PXP")

"""Field level encryption (Fernet) for PHI free text and JSON.

The key comes from ``settings.FIELD_ENCRYPTION_KEY``. Several comma separated keys are
accepted for rotation: the first key encrypts, every key may decrypt. A missing key raises
``ImproperlyConfigured`` unless ``DEBUG`` is true, where a key derived from ``SECRET_KEY``
is used so local development works without setup.
"""
from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models

from .exceptions import DecryptionError

PREFIX = "enc1:"


def _build_keys() -> list[str]:
    raw = getattr(settings, "FIELD_ENCRYPTION_KEY", "") or ""
    keys = [k.strip() for k in raw.split(",") if k.strip()]
    if keys:
        return keys
    if settings.DEBUG:
        digest = hashlib.sha256(f"dev-field-key:{settings.SECRET_KEY}".encode()).digest()
        return [base64.urlsafe_b64encode(digest).decode()]
    raise ImproperlyConfigured("FIELD_ENCRYPTION_KEY is required when DEBUG is false.")


def get_fernet() -> MultiFernet:
    """Build the cipher from current settings (not cached so tests can override the key)."""
    try:
        return MultiFernet([Fernet(k.encode()) for k in _build_keys()])
    except (ValueError, TypeError) as exc:
        raise ImproperlyConfigured("FIELD_ENCRYPTION_KEY is not a valid Fernet key.") from exc


def encrypt_text(value: str) -> str:
    """Encrypt a string and return the prefixed token."""
    return PREFIX + get_fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_text(token: str) -> str:
    """Decrypt a prefixed token. Raises ``DecryptionError`` on a bad key or tampering."""
    if not token.startswith(PREFIX):
        raise DecryptionError("Stored value is not an encrypted token.")
    try:
        return get_fernet().decrypt(token[len(PREFIX):].encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeError) as exc:
        raise DecryptionError("Unable to decrypt stored value.") from exc


class EncryptedTextField(models.TextField):
    """TextField whose database value is a Fernet token. Not searchable by content."""

    description = "Encrypted text"

    def get_prep_value(self, value: Any) -> Any:
        value = super().get_prep_value(value)
        if value is None:
            return None
        return encrypt_text(str(value))

    def from_db_value(self, value: Any, expression: Any, connection: Any) -> Any:
        if value is None:
            return None
        return decrypt_text(value)


class EncryptedJSONField(models.TextField):
    """JSON value stored as a Fernet token. Not queryable by key."""

    description = "Encrypted JSON"

    def get_prep_value(self, value: Any) -> Any:
        if value is None:
            return None
        return encrypt_text(json.dumps(value, separators=(",", ":"), sort_keys=True))

    def from_db_value(self, value: Any, expression: Any, connection: Any) -> Any:
        if value is None:
            return None
        return json.loads(decrypt_text(value))

    def to_python(self, value: Any) -> Any:
        if isinstance(value, str) and value.startswith(PREFIX):
            return json.loads(decrypt_text(value))
        return value

    def value_to_string(self, obj: Any) -> str:
        return json.dumps(self.value_from_object(obj))

    def formfield(self, **kwargs: Any) -> Any:
        from django import forms

        return super().formfield(**{"form_class": forms.JSONField, "widget": forms.Textarea, **kwargs})

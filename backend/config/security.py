"""Boot time checks that stop a production process from starting with unsafe secrets."""
from __future__ import annotations

from django.core.exceptions import ImproperlyConfigured

MIN_SECRET_KEY_LENGTH = 32
_PLACEHOLDER_MARKERS = ("insecure", "changeme", "change-me", "change_me", "secret-key", "replace-me", "example")


def validate_production_settings(*, debug: bool, secret_key: str, field_encryption_key: str) -> None:
    """Raise ``ImproperlyConfigured`` when DEBUG is off and a secret is missing or a placeholder."""
    if debug:
        return
    key = secret_key or ""
    lowered = key.lower()
    if len(key) < MIN_SECRET_KEY_LENGTH or any(marker in lowered for marker in _PLACEHOLDER_MARKERS):
        raise ImproperlyConfigured("SECRET_KEY must be a unique random value of 32+ characters when DEBUG is false.")
    if not (field_encryption_key or "").strip():
        raise ImproperlyConfigured("FIELD_ENCRYPTION_KEY is required when DEBUG is false.")

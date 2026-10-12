"""Small shared helpers."""
from __future__ import annotations

import hashlib
import re

from django.conf import settings
from django.http import HttpRequest

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def client_ip(request: HttpRequest | None) -> str | None:
    """Client IP as seen by our outermost trusted proxy.

    ``X-Forwarded-For`` is client controlled, so the first hop cannot be trusted: each trusted
    proxy appends the address it saw, so the real client is ``TRUSTED_PROXY_COUNT`` hops from the
    right. With a count of 0 the header is ignored and ``REMOTE_ADDR`` is used.
    """
    if request is None:
        return None
    trusted = int(getattr(settings, "TRUSTED_PROXY_COUNT", 1))
    hops = [h.strip() for h in request.META.get("HTTP_X_FORWARDED_FOR", "").split(",") if h.strip()]
    if trusted > 0 and hops:
        return hops[-min(trusted, len(hops))]
    return request.META.get("REMOTE_ADDR") or None


def sha256_hex(value: str) -> str:
    """Hex SHA-256 of a string."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    """Strip and lowercase an email address."""
    return (email or "").strip().lower()


def normalize_phone(raw: str, default_country_code: str = "1") -> str:
    """Normalize a US-style phone entry to E.164. Returns "" when it cannot be valid."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    digits = re.sub(r"\D", "", raw)
    candidate = "+" + digits if raw.startswith("+") else "+" + default_country_code + digits
    if not raw.startswith("+") and len(digits) == 11 and digits.startswith(default_country_code):
        candidate = "+" + digits
    return candidate if _E164.match(candidate) else ""

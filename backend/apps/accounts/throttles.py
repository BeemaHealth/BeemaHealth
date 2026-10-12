"""Throttles for the unauthenticated auth endpoints."""
from __future__ import annotations

from typing import Any

from rest_framework.throttling import SimpleRateThrottle

from apps.common.utils import normalize_email, sha256_hex


class AuthIpThrottle(SimpleRateThrottle):
    scope = "auth_ip"
    rate = "20/hour"

    def get_cache_key(self, request: Any, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class AuthEmailThrottle(SimpleRateThrottle):
    """Limits link requests and code attempts per email address."""

    scope = "auth_email"
    rate = "6/hour"

    def get_cache_key(self, request: Any, view: Any) -> str | None:
        email = normalize_email(str(request.data.get("email", ""))) if hasattr(request.data, "get") else ""
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": sha256_hex(email)}


class VerifyIpThrottle(AuthIpThrottle):
    scope = "auth_verify_ip"
    rate = "60/hour"


class VerifyEmailThrottle(AuthEmailThrottle):
    scope = "auth_verify_email"
    rate = "12/hour"

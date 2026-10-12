"""Integration error types. Messages must never contain PHI."""
import os
import traceback


class IntegrationError(Exception):
    """Base class for integration failures with a PHI free message."""


class NotConfigured(IntegrationError):
    """A vendor setting required for the call is missing."""


class PayloadInvalid(IntegrationError):
    """The outbound payload failed validation. ``fields`` lists field paths, never values."""

    def __init__(self, fields: list[str]):
        self.fields = sorted(fields)
        super().__init__("Invalid payload fields: " + ", ".join(self.fields))


class VendorRejected(IntegrationError):
    """The vendor answered but refused the request."""


class WebhookAuthError(IntegrationError):
    """Webhook authentication failed."""


class WebhookTooLarge(IntegrationError):
    """Webhook body exceeded the configured cap."""


class UnresolvedReference(IntegrationError):
    """An inbound event points at a visit or order we do not know (yet)."""


def safe_location(exc: BaseException) -> str:
    """``ExcType at file.py:line`` for logs. Never includes the exception message (may hold PHI)."""
    frames = traceback.extract_tb(exc.__traceback__)
    where = f"{os.path.basename(frames[-1].filename)}:{frames[-1].lineno}" if frames else "unknown"
    return f"{type(exc).__name__} at {where}"

"""Validation for refill side-effect check-ins and refill request cooldown."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from django.utils import timezone

from apps.common.validation.form import is_filled, is_valid_optional_free_text

if TYPE_CHECKING:
    from apps.intakes.models import RefillRequest

SIDE_EFFECT_DETAIL_MAX_LENGTH = 200
REFILL_REQUEST_COOLDOWN_HOURS = 24


@dataclass(frozen=True)
class RefillCooldownStatus:
    active: bool
    retry_after: datetime | None
    hours_remaining: float | None


def get_refill_cooldown(
    last_refill: RefillRequest | None,
    *,
    now: datetime | None = None,
) -> RefillCooldownStatus:
    """Return cooldown state from the patient's most recent refill request."""
    if last_refill is None:
        return RefillCooldownStatus(active=False, retry_after=None, hours_remaining=None)

    current = now or timezone.now()
    cooldown = timedelta(hours=REFILL_REQUEST_COOLDOWN_HOURS)
    elapsed = current - last_refill.created_at
    if elapsed >= cooldown:
        return RefillCooldownStatus(active=False, retry_after=None, hours_remaining=None)

    retry_after = last_refill.created_at + cooldown
    remaining = cooldown - elapsed
    hours_remaining = round(remaining.total_seconds() / 3600, 1)
    return RefillCooldownStatus(
        active=True,
        retry_after=retry_after,
        hours_remaining=hours_remaining,
    )


def validate_refill_request_allowed(
    last_refill: RefillRequest | None,
    *,
    now: datetime | None = None,
) -> str | None:
    """Patient-safe error when a refill request is inside the cooldown window."""
    status = get_refill_cooldown(last_refill, now=now)
    if not status.active:
        return None

    hours = status.hours_remaining or 0
    if hours >= 1:
        wait_phrase = f"about {int(hours)} more hour{'s' if int(hours) != 1 else ''}"
    else:
        wait_phrase = "a little while longer"

    return (
        "You can submit another refill request 24 hours after your last request. "
        f"Please wait {wait_phrase} before trying again. "
        "If your medication has not arrived, contact support instead of submitting "
        "another request."
    )


def validate_side_effect_detail(value: str) -> str | None:
    if not is_filled(value):
        return "Describe the side effect."
    if not is_valid_optional_free_text(value, max_length=SIDE_EFFECT_DETAIL_MAX_LENGTH):
        return "Enter a valid side effect description."
    return None

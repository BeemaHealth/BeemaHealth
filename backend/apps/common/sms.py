from __future__ import annotations

import base64
import logging
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(*, to_phone: str, body: str) -> None:
    """
    Send an SMS alert. Message body should stay generic — use dashboard links
    for care-team notifications instead of embedding PHI.
    """
    digits = "".join(ch for ch in to_phone if ch.isdigit())
    if len(digits) < 10:
        raise ValueError("Invalid phone number for SMS delivery.")

    backend = getattr(settings, "SMS_BACKEND", "console")
    if backend == "console":
        logger.info("SMS queued via console backend (recipient digits: ...%s)", digits[-4:])
        return

    if backend == "twilio":
        _send_twilio_sms(to_phone=digits, body=body)
        return

    raise ValueError(f"Unsupported SMS_BACKEND: {backend!r}")


def _send_twilio_sms(*, to_phone: str, body: str) -> None:
    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    if not account_sid or not auth_token or not from_number:
        raise ValueError("Twilio SMS is not configured.")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    payload = urlencode(
        {
            "To": f"+1{to_phone[-10:]}",
            "From": from_number,
            "Body": body,
        }
    ).encode()
    request = Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
    request.add_header("Authorization", f"Basic {credentials}")

    with urlopen(request, timeout=15) as response:
        if response.status >= 400:
            raise RuntimeError(f"Twilio SMS failed with status {response.status}")

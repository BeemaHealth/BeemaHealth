"""Beluga Health adapter (docs/vendor/BELUGA_API.md).

Bearer auth, 20s timeout, 3 attempts with backoff on 5xx and network errors. Request bodies and
responses are never logged. Each logical call writes one redacted ``OutboundCall`` row.
"""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import quote

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from apps.integrations.adapters.base import (
    MessageSendResult,
    NetworkAdapter,
    ParsedWebhook,
    VisitSnapshot,
    VisitSubmitResult,
)
from apps.integrations.adapters.mapper import summarize_visit_body
from apps.integrations.exceptions import NotConfigured, PayloadInvalid

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 20
MAX_ATTEMPTS = 3
FAKE_PATHS = {"create_visit": "visit/create", "send_chat": "chat/send"}
FETCH_PATH_TEMPLATE = "visit/externalFetch/{master_id}"

KNOWN_EVENTS = {
    "RX_WRITTEN",
    "CONSULT_CONCLUDED",
    "CONSULT_CANCELED",
    "DOCTOR_CHAT",
    "CS_MESSAGE",
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
    "NO_SHOW",
    "PHARMACY_ORDER_IN_FULFILLMENT",
    "PHARMACY_ORDER_SHIPPED",
    "PHARMACY_ORDER_DELIVERED",
    "PACKAGE_IN_TRANSIT",
    "PACKAGE_OUT_FOR_DELIVERY",
    "PACKAGE_DELIVERED",
    "PACKAGE_DELIVERY_FAILED",
    "LAB_ORDER_SHIPPED_TO_PATIENT",
    "LAB_ORDER_DELIVERED_TO_PATIENT",
    "LAB_ORDER_SHIPPED_TO_LAB",
    "LAB_ORDER_RECEIVED_BY_LAB",
    "LAB_ORDER_RESULTS",
    "LAB_ORDER_REQUISITION_CREATED",
}


class TransportError(Exception):
    """Network level failure (timeout, connection reset). Carries no request data."""


@dataclass
class TransportResponse:
    status_code: int
    body: dict[str, Any] = field(default_factory=dict)


class BelugaTransport:
    """HTTP transport interface so tests can swap in a fake."""

    def request(self, method: str, url: str, *, json: dict[str, Any] | None, headers: dict[str, str], timeout: int) -> TransportResponse:
        raise NotImplementedError


class RequestsTransport(BelugaTransport):
    """Real transport over ``requests``."""

    def request(self, method, url, *, json, headers, timeout):  # type: ignore[override]
        try:
            response = requests.request(method, url, json=json, headers=headers, timeout=timeout)
        except requests.RequestException as exc:
            raise TransportError(type(exc).__name__) from exc
        try:
            body = response.json() if response.content else {}
        except ValueError:
            body = {}
        return TransportResponse(response.status_code, body if isinstance(body, dict) else {})


class FakeBelugaTransport(BelugaTransport):
    """Scripted transport for tests. Responses are consumed in order; the last one repeats."""

    def __init__(self, responses: list[TransportResponse | Exception] | None = None):
        self.responses = list(responses or [TransportResponse(200, {"status": 200})])
        self.calls: list[dict[str, Any]] = []

    def request(self, method, url, *, json, headers, timeout):  # type: ignore[override]
        self.calls.append({"method": method, "url": url, "json": json, "headers": headers, "timeout": timeout})
        item = self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]
        if isinstance(item, Exception):
            raise item
        return item


class DevFakeTransport(BelugaTransport):
    """DEV ONLY in-process Beluga. Accepts any request, never touches the network.

    Enabled by ``BELUGA_FAKE_MODE`` and only when ``DEBUG`` is true. Visit creation returns a
    deterministic masterId derived from the request's masterId. Chat sends are recorded by
    masterId and length only.
    """

    sent_chats: list[dict[str, Any]] = []
    created_visits: list[str] = []

    @staticmethod
    def fake_master_id(master_id: str) -> str:
        return "fake-" + hashlib.sha256(master_id.encode()).hexdigest()[:12]

    @classmethod
    def reset(cls) -> None:
        cls.sent_chats, cls.created_visits = [], []

    def request(self, method, url, *, json, headers, timeout):  # type: ignore[override]
        if method == "GET":
            return TransportResponse(200, {"status": 200, "masterId": url.rsplit("/", 1)[-1], "visitStatus": "pending", "data": {}})
        if json and "formObj" in json:
            fake_id = self.fake_master_id(json["masterId"])
            type(self).created_visits.append(fake_id)
            return TransportResponse(200, {"status": 200, "info": "Patient visit created successfully", "data": {"masterId": fake_id, "visitId": "visit-" + fake_id}})
        type(self).sent_chats.append({"masterId": (json or {}).get("masterId"), "content_length": len((json or {}).get("content", ""))})
        return TransportResponse(200, {"status": 200})


def fake_mode_enabled() -> bool:
    """True when the dev fake is on. Raises ``ImproperlyConfigured`` if requested with DEBUG off."""
    if not getattr(settings, "BELUGA_FAKE_MODE", False):
        return False
    if not settings.DEBUG:
        raise ImproperlyConfigured("BELUGA_FAKE_MODE is only allowed when DEBUG is true.")
    return True


def _backoff_sleep(attempt: int) -> None:
    time.sleep(getattr(settings, "BELUGA_RETRY_BACKOFF_SECONDS", 0.5) * (2 ** (attempt - 1)))


class BelugaAdapter(NetworkAdapter):
    vendor = "beluga"

    def __init__(self, transport: BelugaTransport | None = None, sleep: Callable[[int], None] = _backoff_sleep):
        self.transport = transport or (DevFakeTransport() if fake_mode_enabled() else RequestsTransport())
        self._sleep = sleep

    def capabilities(self) -> set[str]:
        return {"submit_visit", "chat", "fetch_visit", "webhooks"}

    def _url(self, path: str, endpoint_name: str, dev_fake: bool = False) -> str:
        base = (getattr(settings, "BELUGA_BASE_URL", "") or ("https://beluga.fake" if dev_fake else "")).rstrip("/")
        if not base or not path:
            raise NotConfigured(f"Beluga endpoint not configured: {endpoint_name}")
        return f"{base}/{path.lstrip('/')}"

    def _call(
        self,
        endpoint_name: str,
        method: str,
        path: str,
        body: dict[str, Any] | None,
        summary: dict[str, Any],
        treatment: Any = None,
    ) -> tuple[TransportResponse | None, str]:
        """Perform the call with retries. Returns (response or None, safe error code)."""
        from apps.integrations.models import OutboundCall

        dev_fake = isinstance(self.transport, DevFakeTransport)
        api_key = getattr(settings, "BELUGA_API_KEY", "") or ("fake-key" if dev_fake else "")
        if not api_key:
            raise NotConfigured("BELUGA_API_KEY is not set")
        url = self._url(path or (FAKE_PATHS.get(endpoint_name, "") if dev_fake else ""), endpoint_name, dev_fake)
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        started = time.monotonic()
        response: TransportResponse | None = None
        error = ""
        attempts = 0
        while attempts < MAX_ATTEMPTS:
            attempts += 1
            try:
                response = self.transport.request(method, url, json=body, headers=headers, timeout=TIMEOUT_SECONDS)
                error = ""
            except TransportError as exc:
                response, error = None, f"transport_error:{exc}"
            if response is not None and response.status_code < 500:
                break
            if response is not None:
                error = f"http_{response.status_code}"
            if attempts < MAX_ATTEMPTS:
                self._sleep(attempts)
        ok = response is not None and response.status_code == 200 and self._body_ok(response.body)
        if response is not None and not ok and not error:
            error = f"http_{response.status_code}" if response.status_code != 200 else "vendor_rejected"
        OutboundCall.objects.create(
            vendor=self.vendor,
            endpoint_name=endpoint_name,
            treatment=treatment,
            request_summary=summary,
            status_code=response.status_code if response is not None else None,
            ok=ok,
            attempts=attempts,
            error=error[:500],
            duration_ms=int((time.monotonic() - started) * 1000),
        )
        logger.info("beluga call endpoint=%s ok=%s attempts=%s", endpoint_name, ok, attempts)
        return response, error

    @staticmethod
    def _body_ok(body: dict[str, Any]) -> bool:
        status = body.get("status")
        return not (isinstance(status, int) and status >= 400) and "error" not in body

    def submit_visit(self, body: dict[str, Any], *, treatment: Any = None) -> VisitSubmitResult:
        response, error = self._call(
            "create_visit", "POST", getattr(settings, "BELUGA_VISIT_PATH", ""), body, summarize_visit_body(body), treatment
        )
        if response is None or not self._body_ok(response.body) or response.status_code != 200:
            return VisitSubmitResult(ok=False, error=error or "vendor_rejected", status_code=getattr(response, "status_code", None))
        data = response.body.get("data")
        if isinstance(data, dict):
            master_id, visit_id = str(data.get("masterId") or ""), str(data.get("visitId") or "")
        else:
            master_id, visit_id = str(data or ""), ""
        return VisitSubmitResult(
            ok=True, master_id=master_id or body["masterId"], visit_id=visit_id, status_code=response.status_code
        )

    def send_message(self, *, master_id, content, first_name, last_name, treatment=None):  # type: ignore[override]
        body = {"firstName": first_name, "lastName": last_name, "content": content, "isMedia": False, "masterId": master_id}
        if not all(str(v).strip() for k, v in body.items() if k != "isMedia"):
            raise PayloadInvalid([k for k, v in body.items() if k != "isMedia" and not str(v).strip()])
        summary = {"masterId": master_id, "isMedia": False, "content_length": len(content)}
        response, error = self._call("send_chat", "POST", getattr(settings, "BELUGA_CHAT_PATH", ""), body, summary, treatment)
        if response is None or response.status_code != 200 or not self._body_ok(response.body):
            return MessageSendResult(ok=False, error=error or "vendor_rejected", status_code=getattr(response, "status_code", None))
        return MessageSendResult(ok=True, status_code=response.status_code)

    def fetch_visit(self, master_id: str, *, treatment: Any = None) -> VisitSnapshot | None:
        path = FETCH_PATH_TEMPLATE.format(master_id=quote(master_id, safe=""))
        response, _ = self._call("fetch_visit", "GET", path, None, {"masterId": master_id}, treatment)
        if response is None or response.status_code != 200 or not self._body_ok(response.body):
            return None
        data = response.body
        rx_history = (data.get("data") or {}).get("rxHistory") or []
        return VisitSnapshot(
            master_id=str(data.get("masterId") or master_id),
            visit_status=str(data.get("visitStatus") or ""),
            resolved_status=str(data.get("resolvedStatus") or ""),
            rx_history=[
                {
                    "rx_id": str(r.get("rxId") or ""),
                    "med_id": str(r.get("medId") or ""),
                    "name": str(r.get("name") or ""),
                    "strength": str(r.get("strength") or ""),
                    "quantity": str(r.get("quantity") or ""),
                    "refills": str(r.get("refills") or ""),
                    "pharmacy_notes": str(r.get("pharmacyNotes") or ""),
                }
                for r in rx_history
                if isinstance(r, dict)
            ],
        )

    def parse_webhook(self, payload: dict[str, Any]) -> ParsedWebhook:
        event = str(payload.get("event") or "").strip()
        master_id = str(payload.get("masterId") or "").strip()
        if not event:
            raise PayloadInvalid(["event"])
        return ParsedWebhook(
            event=event, master_id=master_id, order_id=str(payload.get("orderId") or "").strip(), payload=payload
        )

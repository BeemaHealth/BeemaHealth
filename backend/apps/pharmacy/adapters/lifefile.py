from __future__ import annotations

import base64
import json
from typing import Any
from urllib import error, request

from django.conf import settings

from apps.integrations.adapters.base import PharmacyProviderAdapter, PharmacySubmitResult, PharmacyWebhookResult
from apps.pharmacy.adapters.mock import MockPharmacyAdapter
from apps.pharmacy.mappers.lifefile import LifeFilePayloadMapper


class MediVeraLifeFileAdapter(PharmacyProviderAdapter):
    partner_slug = "medivera"

    def __init__(self):
        self._mock = MockPharmacyAdapter()

    def build_order_payload(
        self,
        *,
        order,
        prescription,
        snapshot: dict,
        message_id: int,
    ) -> dict[str, Any]:
        mapper = LifeFilePayloadMapper(
            shipping_service=getattr(settings, "LIFEFILE_SHIPPING_SERVICE", 0),
            handling_service=getattr(settings, "LIFEFILE_HANDLING_SERVICE", 0),
            practice_id=getattr(settings, "LIFEFILE_PRACTICE_ID", 0),
        )
        return mapper.build(order=order, prescription=prescription, snapshot=snapshot, message_id=message_id)

    def submit_order(self, payload: dict[str, Any]) -> PharmacySubmitResult:
        base_url = getattr(settings, "LIFEFILE_API_BASE_URL", "").rstrip("/")
        if not base_url:
            return self._mock.submit_order(payload)

        body_bytes = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "X-Vendor-ID": str(getattr(settings, "LIFEFILE_VENDOR_ID", "")),
            "X-Location-ID": str(getattr(settings, "LIFEFILE_LOCATION_ID", "")),
            "X-API-Network-ID": str(getattr(settings, "LIFEFILE_API_NETWORK_ID", "")),
        }
        username = getattr(settings, "LIFEFILE_BASIC_AUTH_USER", "")
        password = getattr(settings, "LIFEFILE_BASIC_AUTH_PASSWORD", "")
        if username and password:
            token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
            headers["Authorization"] = f"Basic {token}"

        req = request.Request(
            f"{base_url}/order",
            data=body_bytes,
            headers=headers,
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                raw = response.read().decode("utf-8")
                status_code = response.status
        except error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"LifeFile order failed ({exc.code}): {raw}") from exc
        except error.URLError as exc:
            raise RuntimeError(f"LifeFile order request failed: {exc.reason}") from exc

        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"message": raw}

        if status_code >= 400:
            raise RuntimeError(f"LifeFile order failed ({status_code}): {body}")

        data = body.get("data") if isinstance(body.get("data"), dict) else {}
        external_order_id = str(
            data.get("orderId")
            or data.get("order_id")
            or body.get("orderId")
            or ""
        )
        return PharmacySubmitResult(
            external_order_id=external_order_id,
            response_payload=body,
            status="submitted",
        )

    def parse_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        return self._mock.parse_webhook(payload)

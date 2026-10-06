from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings

from apps.integrations.adapters.base import PharmacyProviderAdapter, PharmacySubmitResult, PharmacyWebhookResult
from apps.pharmacy.mappers.lifefile import LifeFilePayloadMapper


class MockPharmacyAdapter(PharmacyProviderAdapter):
    partner_slug = "mock"

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
        fake_id = str(abs(hash(str(payload.get("message", {}).get("id", uuid.uuid4())))) % 10_000_000)
        return PharmacySubmitResult(
            external_order_id=fake_id,
            response_payload={
                "type": "success",
                "message": "Mock order accepted",
                "data": {"orderId": fake_id},
            },
        )

    def parse_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        order_id = str(payload.get("orderId") or payload.get("order_id") or "")
        reference_id = str(payload.get("referenceId") or payload.get("reference_id") or "")
        status = str(payload.get("status") or payload.get("orderStatus") or "")
        event_type = str(payload.get("eventType") or payload.get("event_type") or status)
        tracking = str(payload.get("trackingNumber") or payload.get("tracking_number") or "")
        carrier = str(payload.get("carrier") or "")
        idempotency = str(payload.get("idempotencyKey") or payload.get("eventId") or f"{order_id}:{event_type}:{status}")
        return PharmacyWebhookResult(
            external_order_id=order_id,
            external_reference_id=reference_id,
            event_type=event_type,
            status=status,
            tracking_number=tracking,
            carrier=carrier,
            idempotency_key=idempotency,
        )


class OpenLoopPharmacyAdapter(PharmacyProviderAdapter):
    partner_slug = "openloop"

    def build_order_payload(self, *, order, prescription, snapshot: dict, message_id: int) -> dict[str, Any]:
        raise NotImplementedError("OpenLoop pharmacy payload builder is not implemented yet.")

    def submit_order(self, payload: dict[str, Any]) -> PharmacySubmitResult:
        raise NotImplementedError("OpenLoop pharmacy submit is not implemented yet.")

    def parse_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        raise NotImplementedError("OpenLoop pharmacy webhook parsing is not implemented yet.")

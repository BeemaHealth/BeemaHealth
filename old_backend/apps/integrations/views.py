import json
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.dev_logging import dev_log
from apps.integrations.adapters.doctor import get_doctor_adapter
from apps.integrations.adapters.beluga import parse_beluga_webhook
from apps.integrations.permissions import BelugaWebhookPermission, DoctorWebhookPermission
from apps.integrations.services import apply_beluga_webhook, apply_doctor_webhook

logger = logging.getLogger(__name__)


class BelugaWebhookView(APIView):
    permission_classes = [BelugaWebhookPermission]
    authentication_classes = []

    def post(self, request):
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body)
        except (json.JSONDecodeError, TypeError, ValueError):
            return Response({"detail": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST)

        # masterId/event are opaque IDs, not PHI — safe to log unconditionally.
        # Full payload (medsPrescribed, chat content, etc.) is dev-only.
        logger.info(
            "[BELUGA WEBHOOK IN] received event=%s masterId=%s",
            payload.get("event"),
            payload.get("masterId"),
        )
        dev_log(
            logger,
            "[BELUGA WEBHOOK IN] raw payload:\n%s",
            json.dumps(payload, indent=2, default=str),
        )

        try:
            event = parse_beluga_webhook(payload)
            result = apply_beluga_webhook(event)
        except (KeyError, ValueError) as exc:
            logger.warning(
                "[BELUGA WEBHOOK IN] rejected event=%s masterId=%s error=%s",
                payload.get("event"),
                payload.get("masterId"),
                str(exc),
            )
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(
            "[BELUGA WEBHOOK IN] applied event=%s masterId=%s result=%s",
            event.event,
            event.master_id,
            result,
        )
        return Response(result, status=status.HTTP_200_OK)


class DoctorWebhookView(APIView):
    permission_classes = [DoctorWebhookPermission]
    authentication_classes = []

    def post(self, request):
        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(request.body)
        except (json.JSONDecodeError, TypeError, ValueError):
            return Response(
                {"detail": "Invalid JSON payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        adapter = get_doctor_adapter(payload.get("doctor_partner") or "mock")
        try:
            result = adapter.parse_webhook(payload)
            review, prescription = apply_doctor_webhook(result)
        except (KeyError, ValueError, NotImplementedError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "review_id": str(review.id),
                "status": review.status,
                "prescription_id": str(prescription.id) if prescription else None,
            },
            status=status.HTTP_200_OK,
        )

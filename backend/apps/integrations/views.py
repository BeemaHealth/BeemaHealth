import json

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.integrations.adapters.doctor import get_doctor_adapter
from apps.integrations.permissions import DoctorWebhookPermission
from apps.integrations.services import apply_doctor_webhook


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

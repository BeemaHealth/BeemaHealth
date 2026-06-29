from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff


class StaffDevSettingsView(APIView):
    """Runtime dev-mode toggles. Only available when DEBUG=True."""

    permission_classes = [IsStaff]

    def _guard(self):
        if not settings.DEBUG:
            return Response(
                {"detail": "Dev settings are only available in DEBUG mode."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request):
        if (err := self._guard()) is not None:
            return err
        return Response(
            {
                "debug": True,
                "require_email_verification": getattr(
                    settings, "REQUIRE_EMAIL_VERIFICATION", True
                ),
            }
        )

    def patch(self, request):
        if (err := self._guard()) is not None:
            return err
        value = request.data.get("require_email_verification")
        if not isinstance(value, bool):
            return Response(
                {"detail": "require_email_verification must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        settings.REQUIRE_EMAIL_VERIFICATION = value
        return Response({"require_email_verification": value})


class StaffDevBelugaMockView(APIView):
    """Fire a mock Beluga webhook for a patient. DEBUG only."""

    permission_classes = [IsStaff]

    def post(self, request):
        if not settings.DEBUG:
            return Response(
                {"detail": "Only available in DEBUG mode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.accounts.models import User
        from apps.integrations.adapters.beluga import BelugaWebhookEvent
        from apps.integrations.services import apply_beluga_webhook

        patient_id = request.data.get("patient_id")
        patient_email = request.data.get("patient_email")
        event_type = str(request.data.get("event", "")).strip()

        if not event_type:
            return Response({"detail": "event is required."}, status=status.HTTP_400_BAD_REQUEST)

        if patient_id:
            patient = User.objects.filter(id=patient_id, is_patient=True).first()
        elif patient_email:
            patient = User.objects.filter(email=patient_email, is_patient=True).first()
        else:
            return Response(
                {"detail": "patient_id or patient_email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if patient is None:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        evt = BelugaWebhookEvent(
            master_id=f"dev-mock-{patient.id}",
            event=event_type,
            visit_outcome=request.data.get("visitOutcome"),
            doc_name=request.data.get("docName") or "Dev Doctor",
            meds_prescribed=request.data.get("medsPrescribed") or [],
            content=request.data.get("content"),
            order_id=request.data.get("orderId"),
            info=request.data.get("info") or {},
        )

        try:
            result = apply_beluga_webhook(evt, patient=patient)
        except (ValueError, Exception) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class StaffSummaryView(APIView):
    """Lightweight KPI shell for the staff CRM dashboard."""

    permission_classes = [IsStaff]

    def get(self, request):
        from apps.accounts.models import User
        from apps.eligibility.models import FunnelSession
        from apps.intakes.models import MedicalIntake

        return Response(
            {
                "total_patients": User.objects.filter(is_patient=True).count(),
                "active_funnel_sessions": FunnelSession.objects.filter(
                    status=FunnelSession.Status.ACTIVE
                ).count(),
                "submitted_intakes": MedicalIntake.objects.filter(
                    status__in=["submitted", "under_review", "more_info_needed"]
                ).count(),
            }
        )

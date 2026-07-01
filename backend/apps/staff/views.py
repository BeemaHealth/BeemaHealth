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


def _resolve_staff_dev_patient(request):
    from apps.accounts.models import User

    patient_id = request.data.get("patient_id") or request.query_params.get("patient_id")
    patient_email = request.data.get("patient_email") or request.query_params.get(
        "patient_email"
    )
    if patient_id:
        return User.objects.filter(id=patient_id, is_patient=True).first()
    if patient_email:
        return User.objects.filter(email=patient_email, is_patient=True).first()
    return None


class StaffDevBelugaMockTargetsView(APIView):
    """
    List the visits a mock Beluga webhook can be fired against for a patient:
    their initial consult (if a masterId has been assigned) and every refill
    request on file. Read-only — never mutates ProviderReview.external_review_id;
    that only happens lazily in StaffDevBelugaMockView.post() when actually firing
    an event against a fresh initial consult. DEBUG only.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        if not settings.DEBUG:
            return Response(
                {"detail": "Only available in DEBUG mode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.intakes.models import RefillRequest
        from apps.reviews.models import ProviderReview

        patient = _resolve_staff_dev_patient(request)
        if patient is None:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        review = ProviderReview.objects.filter(user=patient).first()
        targets = [
            {
                "kind": "initial_consult",
                "label": "Initial consult",
                "master_id": review.external_review_id if review else "",
            }
        ]
        for refill in RefillRequest.objects.filter(user=patient).order_by("-created_at"):
            label = "Titration" if refill.request_type == "titration" else "Same dose"
            targets.append(
                {
                    "kind": "refill",
                    "id": str(refill.id),
                    "label": f"{label} — {refill.status} — {refill.created_at.date().isoformat()}",
                    "master_id": refill.beluga_master_id,
                    "request_type": refill.request_type,
                    "status": refill.status,
                    "beluga_order_id": refill.beluga_order_id,
                }
            )

        return Response({"patient_id": str(patient.id), "targets": targets})


class StaffDevBelugaMockView(APIView):
    """
    Fire a mock Beluga webhook against a specific visit (the initial consult or
    a specific refill request), routed through the exact same lookup logic a
    real Beluga webhook would use (apply_beluga_webhook) — no bypass. DEBUG only.
    """

    permission_classes = [IsStaff]

    def post(self, request):
        if not settings.DEBUG:
            return Response(
                {"detail": "Only available in DEBUG mode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.integrations.adapters.beluga import BelugaWebhookEvent
        from apps.integrations.services import apply_beluga_webhook
        from apps.reviews.models import ProviderReview

        event_type = str(request.data.get("event", "")).strip()
        if not event_type:
            return Response({"detail": "event is required."}, status=status.HTTP_400_BAD_REQUEST)

        patient = _resolve_staff_dev_patient(request)
        if patient is None:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        target_kind = str(request.data.get("target_kind", "")).strip()
        master_id = str(request.data.get("master_id", "")).strip()
        order_id = str(request.data.get("orderId", "")).strip()

        if target_kind == "initial_consult":
            review, _ = ProviderReview.objects.get_or_create(user=patient)
            if not review.external_review_id:
                import uuid

                review.external_review_id = f"mock-consult-{uuid.uuid4()}"
                review.save(update_fields=["external_review_id"])
            master_id = review.external_review_id
        elif not master_id:
            return Response(
                {"detail": "master_id is required unless target_kind=initial_consult."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Order-id attachment (linking this event's orderId to the right
        # RefillRequest) is handled by apply_beluga_webhook itself, the same
        # way a real webhook would be — see services._attach_order_id. The
        # mock tool intentionally has no special "force-attach to this exact
        # row" power a real webhook wouldn't have.
        evt = BelugaWebhookEvent(
            master_id=master_id,
            event=event_type,
            visit_outcome=request.data.get("visitOutcome"),
            doc_name=request.data.get("docName") or "Dev Doctor",
            meds_prescribed=request.data.get("medsPrescribed") or [],
            content=request.data.get("content"),
            order_id=order_id or None,
            info=request.data.get("info") or {},
        )

        try:
            result = apply_beluga_webhook(evt)
        except ValueError as exc:
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

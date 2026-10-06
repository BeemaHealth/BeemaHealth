from __future__ import annotations

from django.db.models import Max, OuterRef, Subquery
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsStaff
from apps.analytics.models import FunnelEvent
from apps.audit.services import log_audit_event
from apps.eligibility.models import EligibilityResponse, FunnelSession
from apps.intakes.models import MedicalIntake


def _funnel_stage(user: User) -> str:
    intake = getattr(user, "intake", None)
    if intake is None:
        try:
            intake = MedicalIntake.objects.get(user=user)
        except MedicalIntake.DoesNotExist:
            intake = None
    if intake and intake.status not in ("draft", ""):
        return intake.status
    if EligibilityResponse.objects.filter(user=user).exists():
        return "registered"
    return "unknown"


class StaffPatientListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="staff_patient_list",
            resource_id="list",
            request=request,
        )

        latest_event = FunnelEvent.objects.filter(user_id=OuterRef("pk")).order_by("-created_at")
        patients = (
            User.objects.filter(is_patient=True)
            .annotate(
                last_event_name=Subquery(latest_event.values("event_name")[:1]),
                last_step_key=Subquery(latest_event.values("step_key")[:1]),
            )
            .order_by("-created_at")[:200]
        )

        stage_filter = request.query_params.get("stage")
        rows = []
        for user in patients:
            stage = _funnel_stage(user)
            if stage_filter and stage != stage_filter:
                continue
            funnel = (
                FunnelSession.objects.filter(claimed_by_user=user)
                .order_by("-claimed_at")
                .first()
            )
            rows.append(
                {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "state": user.state,
                    "stage": stage,
                    "last_event_name": user.last_event_name,
                    "last_step_key": user.last_step_key,
                    "utm_source": funnel.utm_source if funnel else "",
                    "variant_key": funnel.variant_key if funnel else "",
                    "created_at": user.created_at.isoformat(),
                }
            )
        return Response({"patients": rows, "count": len(rows)})

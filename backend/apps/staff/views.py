from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff


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

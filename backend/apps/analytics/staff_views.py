from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff
from apps.analytics.services import dropoff_rates, events_by_day, funnel_step_counts


class StaffAnalyticsFunnelView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slug = request.query_params.get("questionnaire_slug", "qualify")
        data = funnel_step_counts(
            questionnaire_slug=slug,
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
            experiment_id=request.query_params.get("experiment_id"),
            variant_key=request.query_params.get("variant_key"),
        )
        return Response({"questionnaire_slug": slug, "steps": data})


class StaffAnalyticsDropoffView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slug = request.query_params.get("questionnaire_slug", "qualify")
        data = dropoff_rates(
            questionnaire_slug=slug,
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"questionnaire_slug": slug, "steps": data})


class StaffAnalyticsTimelineView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slug = request.query_params.get("questionnaire_slug") or None
        data = events_by_day(
            questionnaire_slug=slug,
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"events": data})

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff
from apps.analytics.models import LandingPage
from apps.analytics.serializers import LandingPageSerializer
from apps.analytics.services import (
    available_questionnaire_slugs,
    cta_performance,
    dropoff_rates,
    events_by_day,
    funnel_step_counts,
    landing_page_performance,
    landing_page_views_by_day,
    page_views_by_day,
    questionnaire_step_analytics,
    questionnaire_version_stats,
    questionnaire_versions_list,
    top_of_funnel_stats,
    traffic_sources,
)


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
            version_id=request.query_params.get("version_id"),
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
            version_id=request.query_params.get("version_id"),
        )
        return Response({"questionnaire_slug": slug, "steps": data})


class StaffAnalyticsVersionsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slug = request.query_params.get("questionnaire_slug", "qualify")
        data = questionnaire_version_stats(
            questionnaire_slug=slug,
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"questionnaire_slug": slug, "versions": data})


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


class StaffAnalyticsTrafficView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        data = traffic_sources(
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"sources": data})


class StaffAnalyticsLandingPagePerformanceView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        data = landing_page_performance(
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"landing_pages": data})


class StaffAnalyticsPageViewsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        return Response(
            {
                "page_views": page_views_by_day(start=start, end=end),
                "landing_page_views": landing_page_views_by_day(start=start, end=end),
            }
        )


class StaffAnalyticsTopOfFunnelView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        data = top_of_funnel_stats(
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response(data)


class StaffAnalyticsStepAnalyticsView(APIView):
    """Per-step analytics (views, completions, dropoff, answer distributions)
    for a single questionnaire version."""

    permission_classes = [IsStaff]

    def get(self, request):
        version_id = request.query_params.get("version_id")
        if not version_id:
            return Response(
                {"detail": "version_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = questionnaire_step_analytics(
            version_id=version_id,
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        if data is None:
            return Response(
                {"detail": "Version not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data)


class StaffAnalyticsVersionsListView(APIView):
    """All versions for a questionnaire type, with session counts."""

    permission_classes = [IsStaff]

    def get(self, request):
        q_type = request.query_params.get("questionnaire_type", "qualify")
        data = questionnaire_versions_list(
            questionnaire_type=q_type,
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"questionnaire_type": q_type, "versions": data})


class StaffAnalyticsSlugsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slugs = available_questionnaire_slugs(
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"slugs": slugs})


class StaffAnalyticsCtaView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        data = cta_performance(
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"ctas": data})


class StaffLandingPageListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        pages = LandingPage.objects.all()
        return Response(LandingPageSerializer(pages, many=True).data)

    def post(self, request):
        serializer = LandingPageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        page = serializer.save()
        return Response(LandingPageSerializer(page).data, status=status.HTTP_201_CREATED)


class StaffLandingPageDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, page_id):
        page = get_object_or_404(LandingPage, id=page_id)
        return Response(LandingPageSerializer(page).data)

    def patch(self, request, page_id):
        page = get_object_or_404(LandingPage, id=page_id)
        serializer = LandingPageSerializer(page, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        page = serializer.save()
        return Response(LandingPageSerializer(page).data)

    def delete(self, request, page_id):
        page = get_object_or_404(LandingPage, id=page_id)
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

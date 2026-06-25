from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff
from apps.analytics.models import LandingPage
from apps.analytics.serializers import LandingPageSerializer
from apps.analytics.services import (
    dropoff_rates,
    events_by_day,
    funnel_step_counts,
    landing_page_performance,
    page_views_by_day,
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
        data = page_views_by_day(
            start=request.query_params.get("start"),
            end=request.query_params.get("end"),
        )
        return Response({"page_views": data})


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

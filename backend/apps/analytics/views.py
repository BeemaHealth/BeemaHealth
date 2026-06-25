from __future__ import annotations

import uuid

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.analytics.models import FunnelEvent
from apps.analytics.validation import sanitize_event_properties, validate_event_name
from apps.eligibility.services import get_funnel_session


class AnalyticsEventThrottle(AnonRateThrottle):
    rate = "120/min"


class FunnelEventCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnalyticsEventThrottle]

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        try:
            event_name = validate_event_name(str(data.get("event_name", "")))
            properties = sanitize_event_properties(data.get("properties"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        funnel_session = None
        if request.user.is_authenticated:
            user = request.user
        else:
            user = None
            funnel_session = get_funnel_session(request)

        version_id = data.get("questionnaire_version_id")
        experiment_id = data.get("experiment_id")
        try:
            parsed_version = uuid.UUID(str(version_id)) if version_id else None
        except ValueError:
            return Response(
                {"detail": "Invalid questionnaire_version_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            parsed_experiment = uuid.UUID(str(experiment_id)) if experiment_id else None
        except ValueError:
            return Response(
                {"detail": "Invalid experiment_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = FunnelEvent.objects.create(
            event_name=event_name,
            funnel_session=funnel_session,
            user=user if request.user.is_authenticated else None,
            questionnaire_slug=str(data.get("questionnaire_slug", ""))[:32],
            questionnaire_version_id=parsed_version,
            step_key=str(data.get("step_key", ""))[:64],
            experiment_id=parsed_experiment,
            variant_key=str(data.get("variant_key", ""))[:32],
            properties=properties,
        )
        return Response({"id": str(event.id)}, status=status.HTTP_201_CREATED)

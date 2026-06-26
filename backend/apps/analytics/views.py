from __future__ import annotations

import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.analytics.models import FunnelEvent, LandingPage
from apps.analytics.serializers import LandingPageSerializer
from apps.analytics.validation import sanitize_event_properties, validate_event_name
from apps.eligibility.services import get_client_ip, get_funnel_session


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

        step_key = str(data.get("step_key", ""))[:64]

        if event_name in ("step_viewed", "step_completed") and not step_key.strip():
            return Response(
                {"detail": "step_key is required for step events."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Dedup: reject identical events submitted within 1 second of each other
        # from the same client (handles React StrictMode double-fire and accidental retries).
        client_ip = None
        dedup_cutoff = timezone.now() - timedelta(seconds=1)
        dedup_qs = FunnelEvent.objects.filter(
            event_name=event_name,
            step_key=step_key,
            created_at__gte=dedup_cutoff,
        )
        if funnel_session:
            dedup_qs = dedup_qs.filter(funnel_session=funnel_session)
        elif user:
            dedup_qs = dedup_qs.filter(user=user)
        else:
            # No session/user — dedup by client IP so we only collapse repeat
            # fires from the *same* client, not events from different anonymous
            # visitors. Without an IP we cannot identify the client, so we skip
            # dedup entirely rather than collapse unrelated visitors' events.
            client_ip = get_client_ip(request)
            if client_ip:
                dedup_qs = dedup_qs.filter(
                    funnel_session__isnull=True,
                    user__isnull=True,
                    ip_address=client_ip,
                )
                page = (properties or {}).get("page", "")
                if page:
                    dedup_qs = dedup_qs.filter(properties__page=page)
            else:
                dedup_qs = dedup_qs.none()

        if dedup_qs.exists():
            existing = dedup_qs.first()
            return Response({"id": str(existing.id)}, status=status.HTTP_200_OK)

        event = FunnelEvent.objects.create(
            event_name=event_name,
            funnel_session=funnel_session,
            user=user if request.user.is_authenticated else None,
            questionnaire_slug=str(data.get("questionnaire_slug", ""))[:32],
            questionnaire_version_id=parsed_version,
            step_key=step_key,
            experiment_id=parsed_experiment,
            variant_key=str(data.get("variant_key", ""))[:32],
            properties=properties,
            ip_address=client_ip if (funnel_session is None and user is None) else None,
        )
        return Response({"id": str(event.id)}, status=status.HTTP_201_CREATED)


class LandingPageResolveView(APIView):
    """Public endpoint — returns a landing page's UTM params by slug."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request, slug):
        try:
            page = LandingPage.objects.get(slug=slug, active=True)
        except LandingPage.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(LandingPageSerializer(page).data)

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.serializers import EligibilitySerializer
from apps.eligibility.services import (
    claim_funnel_session,
    clear_funnel_cookie,
    create_funnel_session,
    get_funnel_session,
    get_or_create_eligibility_for_session,
    set_funnel_cookie,
)

@method_decorator(csrf_exempt, name="dispatch")
class FunnelSessionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        existing = get_funnel_session(request)
        if existing:
            eligibility = get_or_create_eligibility_for_session(existing)
            return Response(EligibilitySerializer(eligibility).data)

        data = request.data if isinstance(request.data, dict) else {}
        session, token = create_funnel_session(
            request,
            utm={
                "utm_source": data.get("utm_source") or "",
                "utm_medium": data.get("utm_medium") or "",
                "utm_campaign": data.get("utm_campaign") or "",
                "utm_content": data.get("utm_content") or "",
            },
            landing_page_slug=str(data.get("landing_page_slug") or "")[:64],
        )
        eligibility = get_or_create_eligibility_for_session(session)
        response = Response(EligibilitySerializer(eligibility).data, status=status.HTTP_201_CREATED)
        set_funnel_cookie(response, token)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class FunnelEligibilityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        session = get_funnel_session(request)
        if not session:
            return Response(status=status.HTTP_404_NOT_FOUND)
        eligibility = get_or_create_eligibility_for_session(session)
        log_audit_event(
            user=None,
            action="read",
            resource_type="eligibility",
            resource_id=str(eligibility.id),
            request=request,
        )
        return Response(EligibilitySerializer(eligibility).data)

    def patch(self, request):
        session = get_funnel_session(request)
        if not session:
            return Response(
                {"detail": "No active funnel session. POST /api/funnel/session/ first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        eligibility = get_or_create_eligibility_for_session(session)
        serializer = EligibilitySerializer(eligibility, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        log_audit_event(
            user=None,
            action="update",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data)


class EligibilityMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        try:
            record = EligibilityResponse.objects.get(user=request.user)
        except EligibilityResponse.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data)

    def post(self, request):
        if EligibilityResponse.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Eligibility record already exists. Use PATCH to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EligibilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(user=request.user)
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        try:
            record = EligibilityResponse.objects.get(user=request.user)
        except EligibilityResponse.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = EligibilitySerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data)


def claim_funnel_for_user(request, user):
    session = get_funnel_session(request)
    if not session:
        return None
    eligibility = claim_funnel_session(session, user)
    log_audit_event(
        user=user,
        action="update",
        resource_type="funnel_session",
        resource_id=str(session.id),
        request=request,
    )
    return eligibility

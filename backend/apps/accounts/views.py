from __future__ import annotations

from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import log
from apps.common.utils import client_ip

from . import auth_service
from .models import User
from .serializers import MeSerializer, RequestLinkSerializer, VerifySerializer
from .throttles import AuthEmailThrottle, AuthIpThrottle, VerifyEmailThrottle, VerifyIpThrottle

GENERIC_REQUEST_DETAIL = "If that email can sign in, a code and link are on the way."
GENERIC_VERIFY_ERROR = "That code or link is invalid or has expired."


class StrictCsrfSessionAuthentication(SessionAuthentication):
    """Session auth that enforces CSRF on every request, anonymous included (blocks login CSRF)."""

    def authenticate(self, request: Request):
        result = super().authenticate(request)
        if result is None:
            self.enforce_csrf(request)
        return result


class CsrfView(APIView):
    """Sets the CSRF cookie and returns the token for the SPA to echo in a header."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [AuthIpThrottle]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request: Request) -> Response:
        return Response({"csrfToken": get_token(request)})


class RequestLinkView(APIView):
    """Always answers 202 with the same body so callers cannot probe for accounts."""

    permission_classes = [AllowAny]
    authentication_classes = [StrictCsrfSessionAuthentication]
    throttle_classes = [AuthIpThrottle, AuthEmailThrottle]

    def post(self, request: Request) -> Response:
        serializer = RequestLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        auth_service.request_login(serializer.validated_data["email"], ip=client_ip(request))
        return Response({"detail": GENERIC_REQUEST_DETAIL}, status=status.HTTP_202_ACCEPTED)


class VerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [StrictCsrfSessionAuthentication]
    throttle_classes = [VerifyIpThrottle, VerifyEmailThrottle]

    def post(self, request: Request) -> Response:
        serializer = VerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ip = client_ip(request)
        if data.get("token"):
            user = auth_service.consume_token(data["token"], ip=ip)
        else:
            user = auth_service.consume_code(data["email"], data["code"], ip=ip)
        if user is None:
            return Response({"detail": GENERIC_VERIFY_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        _ensure_patient_profile(user)
        login(request._request, user, backend="django.contrib.auth.backends.ModelBackend")
        log(request, "login", user, actor=user)
        return Response(MeSerializer(user).data)


def _ensure_patient_profile(user: User) -> None:
    """Patient users get their PatientProfile the first time they sign in."""
    if user.kind != User.Kind.PATIENT:
        return
    from apps.patients.models import PatientProfile

    PatientProfile.objects.get_or_create(user=user)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [StrictCsrfSessionAuthentication]

    def post(self, request: Request) -> Response:
        log(request, "logout", request.user)
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [StrictCsrfSessionAuthentication]

    def get(self, request: Request) -> Response:
        return Response(MeSerializer(request.user).data)

    def patch(self, request: Request) -> Response:
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log(request, "update", request.user, metadata={"fields": sorted(serializer.validated_data.keys())})
        return Response(serializer.data)

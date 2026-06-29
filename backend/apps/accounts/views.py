from django.conf import settings
from django.contrib.auth import authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.serializers import (
    LoginMfaSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
    VerifyEmailSerializer,
)
from apps.accounts.services import (
    create_email_verification_token,
    create_login_mfa_challenge,
    queue_login_mfa_email,
    queue_verification_email,
    verify_email_token,
    verify_login_mfa_challenge,
)
from apps.audit.services import log_audit_event
from apps.eligibility.services import clear_funnel_cookie
from apps.eligibility.views import claim_funnel_for_user
from apps.patients.models import PatientSettings


class AuthThrottle(AnonRateThrottle):
    scope = "auth"


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        claim_funnel_for_user(request, user)
        user.refresh_from_db()

        token, _ = Token.objects.get_or_create(user=user)
        if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True):
            verification_token = create_email_verification_token(user)
            queue_verification_email(user, verification_token)
        else:
            user.email_verified = True
            user.save(update_fields=["email_verified", "updated_at"])

        log_audit_event(
            user=user,
            action="create",
            resource_type="user",
            resource_id=str(user.id),
            request=request,
        )
        response = Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        clear_funnel_cookie(response)
        return response


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        settings_obj, _ = PatientSettings.objects.get_or_create(user=user)
        if settings_obj.two_factor_enabled:
            challenge, code = create_login_mfa_challenge(user)
            queue_login_mfa_email(user, code)
            return Response(
                {
                    "mfa_required": True,
                    "mfa_challenge_id": str(challenge.id),
                    "detail": "A verification code was sent to your email.",
                }
            )
        token, _ = Token.objects.get_or_create(user=user)
        claim_funnel_for_user(request, user)
        log_audit_event(
            user=user,
            action="login",
            resource_type="user",
            resource_id=str(user.id),
            request=request,
        )
        response = Response({"token": token.key, "user": UserSerializer(user).data})
        clear_funnel_cookie(response)
        return response


class MeView(APIView):
    """Validate the current auth token and return the signed-in user."""

    def get(self, request):
        token = Token.objects.filter(user=request.user).first()
        if token is None:
            token = Token.objects.create(user=request.user)
        return Response({"token": token.key, "user": UserSerializer(request.user).data})

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="user",
            resource_id=str(user.id),
            request=request,
        )
        token = Token.objects.filter(user=user).first()
        return Response(
            {
                "token": token.key if token else None,
                "user": UserSerializer(user).data,
            }
        )


class LoginMfaView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = LoginMfaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_login_mfa_challenge(
                str(serializer.validated_data["mfa_challenge_id"]),
                serializer.validated_data["code"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        log_audit_event(
            user=user,
            action="login",
            resource_type="user",
            resource_id=str(user.id),
            request=request,
        )
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        log_audit_event(
            user=request.user,
            action="logout",
            resource_type="user",
            resource_id=str(request.user.id),
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name="dispatch")
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_email_token(serializer.validated_data["token"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_audit_event(
            user=user,
            action="update",
            resource_type="user",
            resource_id=str(user.id),
            request=request,
        )
        return Response({"user": UserSerializer(user).data})


class ResendVerificationView(APIView):
    throttle_classes = [AuthThrottle]

    def post(self, request):
        user = request.user
        if user.email_verified:
            return Response({"detail": "Email is already verified."})
        verification_token = create_email_verification_token(user)
        queue_verification_email(user, verification_token)
        return Response({"detail": "Verification email sent."})

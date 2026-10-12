"""Questionnaire REST API. Server side validation only; the client never chooses the next node."""
from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.utils import client_ip

from . import engine, services
from .models import Submission
from .throttles import AnswerThrottle, StartThrottle, UploadThrottle

COOKIE_NAME = "beema_qs_token"
COOKIE_PATH = "/api/v1/questionnaires/"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30


def _error(code: str, message: str, http_status: int) -> Response:
    return Response({"error": {"code": code, "message": message}}, status=http_status)


def _patient_profile(user: Any) -> Any:
    from apps.patients.models import PatientProfile

    return PatientProfile.objects.filter(user=user).first()


def _resolve(request: Request) -> Submission | None:
    """The caller's submission: the unclaimed one their cookie proves, else their own as a patient."""
    sub = services.resolve_by_token(request.COOKIES.get(COOKIE_NAME))
    if sub is not None:
        return sub
    if request.user.is_authenticated:
        profile = _patient_profile(request.user)
        if profile is not None:
            sid = request.query_params.get("submission_id") or (request.data.get("submission_id") if isinstance(request.data, dict) else None)
            try:
                return services.get_submission_for_patient(profile, sid, open_only=sid is None)
            except (Submission.DoesNotExist, ValidationError, ValueError, TypeError):
                return None
    return None


def _meta(request: Request) -> dict[str, Any]:
    return {"ip": client_ip(request), "user_agent": request.META.get("HTTP_USER_AGENT", "")[:300]}


class _Base(APIView):
    permission_classes = [AllowAny]

    def handle_exception(self, exc: Exception) -> Response:
        if isinstance(exc, services.ServiceError):
            return _error(exc.code, exc.message, exc.status)
        if isinstance(exc, engine.AnswerError):
            return _error(exc.code, exc.message, status.HTTP_400_BAD_REQUEST)
        return super().handle_exception(exc)


class StartView(_Base):
    throttle_classes = [StartThrottle]

    def post(self, request: Request) -> Response:
        slug = request.data.get("questionnaire") if isinstance(request.data, dict) else None
        if not isinstance(slug, str) or not 0 < len(slug) <= 80:
            return _error("invalid_request", "A questionnaire is required.", 400)
        existing = services.resolve_by_token(request.COOKIES.get(COOKIE_NAME))
        if existing and existing.version.questionnaire.slug == slug and existing.status == Submission.Status.IN_PROGRESS:
            return Response(services.describe(existing))
        utm = request.data.get("utm") if isinstance(request.data.get("utm"), dict) else None
        sub, token = services.start(slug, utm=utm)
        response = Response(services.describe(sub), status=status.HTTP_201_CREATED)
        response.set_cookie(
            COOKIE_NAME, token, max_age=COOKIE_MAX_AGE, httponly=True,
            secure=not settings.DEBUG, samesite="Lax", path=COOKIE_PATH,
        )
        return response


class CurrentView(_Base):
    throttle_classes = [AnswerThrottle]

    def get(self, request: Request) -> Response:
        sub = _resolve(request)
        if sub is None:
            # Nothing in progress is a normal first visit, not an error: 204 keeps it out of the console.
            return Response(status=204)
        return Response(services.describe(sub))


class AnswerView(_Base):
    throttle_classes = [AnswerThrottle]

    def post(self, request: Request) -> Response:
        sub = _resolve(request)
        if sub is None:
            return _error("not_found", "No questionnaire in progress.", 404)
        if not isinstance(request.data, dict) or not isinstance(request.data.get("node_id"), str) or "value" not in request.data:
            return _error("invalid_request", "node_id and value are required.", 400)
        updated = services.answer(sub, request.data["node_id"], request.data["value"], meta=_meta(request))
        return Response(services.describe(updated))


class BackView(_Base):
    throttle_classes = [AnswerThrottle]

    def post(self, request: Request) -> Response:
        sub = _resolve(request)
        if sub is None:
            return _error("not_found", "No questionnaire in progress.", 404)
        return Response(services.describe(services.back(sub)))


class ClaimView(_Base):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AnswerThrottle]

    def post(self, request: Request) -> Response:
        profile = _patient_profile(request.user)
        if profile is None:
            return _error("forbidden", "A patient account is required.", 403)
        token = request.COOKIES.get(COOKIE_NAME)
        sub = services.resolve_by_token(token)
        if sub is None:
            return _error("not_found", "No questionnaire to link.", 404)
        updated = services.claim(sub, profile, token)
        response = Response(services.describe(updated))
        response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)
        return response


class UploadUrlView(_Base):
    throttle_classes = [UploadThrottle]

    def post(self, request: Request) -> Response:
        sub = _resolve(request)
        if sub is None:
            return _error("not_found", "No questionnaire in progress.", 404)
        data = request.data if isinstance(request.data, dict) else {}
        file, presigned = services.create_upload(sub, data.get("kind"), data.get("content_type"), data.get("size_bytes"))
        return Response({"file_id": str(file.id), "upload": presigned}, status=status.HTTP_201_CREATED)

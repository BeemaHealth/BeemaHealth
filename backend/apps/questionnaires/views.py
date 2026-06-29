from __future__ import annotations

import json
import uuid
from collections.abc import Mapping

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.questionnaires.models import Questionnaire, QuestionnaireVersion
from apps.questionnaires.services import (
    get_global_published_qualify_version,
    get_published_version,
    get_version_by_id,
    resolve_intake_questionnaire_slug,
    serialize_version,
)


class ActiveQuestionnaireView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug: str):
        version_id = request.query_params.get("version_id")
        if version_id:
            from apps.questionnaires.services import get_version_by_id

            try:
                parsed = uuid.UUID(str(version_id))
            except ValueError:
                return Response(
                    {"detail": "Invalid version_id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            version = get_version_by_id(parsed)
            if not version:
                return Response(status=status.HTTP_404_NOT_FOUND)
            # Multiple qualify questionnaires (distinct slugs, e.g.
            # "qualify-weight-loss") all enter through the "qualify" path. Match
            # by questionnaire type for qualify; require an exact slug match for
            # everything else.
            if slug == "qualify":
                if (
                    version.questionnaire.questionnaire_type
                    != Questionnaire.QuestionnaireType.QUALIFY
                ):
                    return Response(status=status.HTTP_404_NOT_FOUND)
            elif version.questionnaire.slug != slug:
                return Response(status=status.HTTP_404_NOT_FOUND)
            # Decide whether to serve the pinned version or fall back to the
            # current published entry:
            #  - DRAFT: never went live; always fall back.
            #  - ARCHIVED qualify: pre-account funnel sessions should advance to
            #    the latest published qualify flow, so fall back.
            #  - ARCHIVED non-qualify (intake): a patient already part-way
            #    through the questionnaire is pinned to this version. Serve it
            #    as-is so staff publishing a new version does not disrupt or
            #    invalidate an in-progress intake (the version is immutable once
            #    stamped on the intake).
            should_fall_back = version.status == QuestionnaireVersion.Status.DRAFT or (
                version.status == QuestionnaireVersion.Status.ARCHIVED
                and slug == "qualify"
            )
            if should_fall_back:
                version = None
                if slug == "qualify":
                    version = get_global_published_qualify_version()
                else:
                    version = get_published_version(slug)
                if not version:
                    return Response(status=status.HTTP_404_NOT_FOUND)
        else:
            if slug == "qualify":
                version = get_global_published_qualify_version()
            else:
                version = get_published_version(slug)
            if not version:
                return Response(status=status.HTTP_404_NOT_FOUND)
        payload = serialize_version(version)
        return Response(payload)


class ResolveIntakeQuestionnaireView(APIView):
    """Resolve published intake schema from qualify version + responses."""

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        version_id = data.get("qualify_version_id")
        if not version_id:
            return Response(
                {"detail": "qualify_version_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            parsed = uuid.UUID(str(version_id))
        except ValueError:
            return Response(
                {"detail": "Invalid qualify_version_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qualify_version = get_version_by_id(parsed)
        if not qualify_version:
            return Response(status=status.HTTP_404_NOT_FOUND)
        responses_raw = data.get("questionnaire_responses") or {}
        if isinstance(responses_raw, Mapping):
            responses = dict(responses_raw)
        elif isinstance(responses_raw, str):
            try:
                parsed_responses = json.loads(responses_raw)
            except json.JSONDecodeError:
                return Response(
                    {"detail": "questionnaire_responses must be a JSON object."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not isinstance(parsed_responses, dict):
                return Response(
                    {"detail": "questionnaire_responses must be an object."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            responses = parsed_responses
        else:
            return Response(
                {"detail": "questionnaire_responses must be an object."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        intake_slug = resolve_intake_questionnaire_slug(qualify_version, responses)
        if not intake_slug:
            return Response(
                {"detail": "No intake questionnaire configured for these answers."},
                status=status.HTTP_404_NOT_FOUND,
            )
        intake_version = get_published_version(intake_slug)
        if not intake_version:
            return Response(
                {"detail": f"No published intake version for '{intake_slug}'."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "intake_questionnaire_slug": intake_slug,
                "version": serialize_version(intake_version),
            }
        )

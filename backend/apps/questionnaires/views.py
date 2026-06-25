from __future__ import annotations

import uuid

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.questionnaires.models import Questionnaire
from apps.questionnaires.services import get_published_version, serialize_version


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
            if not version or version.questionnaire.slug != slug:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if version.status == "draft":
                return Response(status=status.HTTP_404_NOT_FOUND)
        else:
            version = get_published_version(slug)
            if not version:
                return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_version(version))

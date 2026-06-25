from __future__ import annotations

import uuid

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff
from apps.questionnaires.models import (
    Medication,
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)
from apps.questionnaires.serializers import (
    MedicationSerializer,
    MedicationWriteSerializer,
    QuestionnaireFieldWriteSerializer,
    QuestionnaireListSerializer,
    QuestionnaireStepWriteSerializer,
    QuestionnaireVersionSerializer,
    QuestionnaireWriteSerializer,
)
from apps.questionnaires.services import duplicate_version, publish_version, serialize_version


# ── Medications ──────────────────────────────────────────────────────────────

class StaffMedicationListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        items = Medication.objects.all()
        return Response(MedicationSerializer(items, many=True).data)

    def post(self, request):
        serializer = MedicationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        med = serializer.save()
        return Response(MedicationSerializer(med).data, status=status.HTTP_201_CREATED)


class StaffMedicationDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, medication_id: uuid.UUID):
        med = get_object_or_404(Medication, id=medication_id)
        return Response(MedicationSerializer(med).data)

    def patch(self, request, medication_id: uuid.UUID):
        med = get_object_or_404(Medication, id=medication_id)
        serializer = MedicationWriteSerializer(med, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        med = serializer.save()
        return Response(MedicationSerializer(med).data)

    def delete(self, request, medication_id: uuid.UUID):
        med = get_object_or_404(Medication, id=medication_id)
        med.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Questionnaires ────────────────────────────────────────────────────────────

class StaffQuestionnaireListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        items = Questionnaire.objects.prefetch_related("versions", "medication").all()
        return Response(QuestionnaireListSerializer(items, many=True).data)

    def post(self, request):
        serializer = QuestionnaireWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        q = serializer.save()
        return Response(QuestionnaireListSerializer(q).data, status=status.HTTP_201_CREATED)


class StaffQuestionnaireVersionListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        versions = questionnaire.versions.prefetch_related("steps__fields").order_by("-created_at")
        return Response(QuestionnaireVersionSerializer(versions, many=True).data)

    def post(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        label = str(request.data.get("version_label", "")).strip() or "1.0.0"
        version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label=label,
            created_by=request.user,
        )
        return Response(
            QuestionnaireVersionSerializer(version).data,
            status=status.HTTP_201_CREATED,
        )


class StaffQuestionnaireVersionDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        return Response(serialize_version(version))

    def patch(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        if version.status != QuestionnaireVersion.Status.DRAFT:
            return Response(
                {"detail": "Only draft versions can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        label = request.data.get("version_label")
        if label is not None:
            version.version_label = str(label).strip()[:32]
            version.save(update_fields=["version_label", "updated_at"])
        return Response(serialize_version(version))


class StaffQuestionnairePublishView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        try:
            publish_version(version)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        version.refresh_from_db()
        return Response(serialize_version(version))


class StaffQuestionnaireDuplicateView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        clone = duplicate_version(version, created_by=request.user)
        return Response(serialize_version(clone), status=status.HTTP_201_CREATED)


class StaffQuestionnaireStepListView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
            status=QuestionnaireVersion.Status.DRAFT,
        )
        serializer = QuestionnaireStepWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        step = QuestionnaireStep.objects.create(version=version, **serializer.validated_data)
        return Response(
            {
                "id": str(step.id),
                "step_key": step.step_key,
                "sort_order": step.sort_order,
                "title": step.title,
                "subtitle": step.subtitle,
                "visibility_rule": step.visibility_rule,
                "fields": [],
            },
            status=status.HTTP_201_CREATED,
        )


class StaffQuestionnaireStepDetailView(APIView):
    permission_classes = [IsStaff]

    def patch(self, request, slug: str, version_id: uuid.UUID, step_key: str):
        step = get_object_or_404(
            QuestionnaireStep,
            version_id=version_id,
            version__questionnaire__slug=slug,
            version__status=QuestionnaireVersion.Status.DRAFT,
            step_key=step_key,
        )
        serializer = QuestionnaireStepWriteSerializer(step, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for attr, value in serializer.validated_data.items():
            setattr(step, attr, value)
        step.save()
        return Response(serialize_version(step.version))

    def delete(self, request, slug: str, version_id: uuid.UUID, step_key: str):
        step = get_object_or_404(
            QuestionnaireStep,
            version_id=version_id,
            version__questionnaire__slug=slug,
            version__status=QuestionnaireVersion.Status.DRAFT,
            step_key=step_key,
        )
        step.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffQuestionnaireFieldListView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str, version_id: uuid.UUID, step_key: str):
        step = get_object_or_404(
            QuestionnaireStep,
            version_id=version_id,
            version__questionnaire__slug=slug,
            version__status=QuestionnaireVersion.Status.DRAFT,
            step_key=step_key,
        )
        serializer = QuestionnaireFieldWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        field = QuestionnaireField.objects.create(step=step, **serializer.validated_data)
        return Response(
            {
                "id": str(field.id),
                **serializer.validated_data,
            },
            status=status.HTTP_201_CREATED,
        )


class StaffQuestionnaireFieldDetailView(APIView):
    permission_classes = [IsStaff]

    def patch(self, request, slug: str, version_id: uuid.UUID, step_key: str, field_key: str):
        field = get_object_or_404(
            QuestionnaireField,
            step__version_id=version_id,
            step__version__questionnaire__slug=slug,
            step__version__status=QuestionnaireVersion.Status.DRAFT,
            step__step_key=step_key,
            field_key=field_key,
        )
        serializer = QuestionnaireFieldWriteSerializer(field, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for attr, value in serializer.validated_data.items():
            setattr(field, attr, value)
        field.save()
        return Response(QuestionnaireFieldWriteSerializer(field).data)

    def delete(self, request, slug: str, version_id: uuid.UUID, step_key: str, field_key: str):
        field = get_object_or_404(
            QuestionnaireField,
            step__version_id=version_id,
            step__version__questionnaire__slug=slug,
            step__version__status=QuestionnaireVersion.Status.DRAFT,
            step__step_key=step_key,
            field_key=field_key,
        )
        field.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

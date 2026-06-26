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
    QuestionnaireDuplicateSerializer,
    QuestionnaireFieldWriteSerializer,
    QuestionnaireListSerializer,
    QuestionnaireStepWriteSerializer,
    QuestionnaireUpdateSerializer,
    QuestionnaireVersionSerializer,
    QuestionnaireWriteSerializer,
)
from apps.questionnaires.services import (
    duplicate_questionnaire,
    duplicate_version,
    get_published_qualify_cta_ownership,
    publish_version,
    questionnaire_delete_blocked_reason,
    questionnaire_slug_rename_blocked_reason,
    questionnaire_version_is_in_use,
    serialize_version,
)


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

class StaffQualifyCtaOwnershipView(APIView):
    """Published qualify versions that currently own each CTA id."""

    permission_classes = [IsStaff]

    def get(self, request):
        ownership = get_published_qualify_cta_ownership()
        return Response({"ownership": list(ownership.values())})


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


class StaffQuestionnaireDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        return Response(QuestionnaireListSerializer(questionnaire).data)

    def patch(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        serializer = QuestionnaireUpdateSerializer(
            questionnaire, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        new_slug = serializer.validated_data.get("slug")
        if new_slug and new_slug != questionnaire.slug:
            blocked = questionnaire_slug_rename_blocked_reason(
                questionnaire, new_slug=new_slug
            )
            if blocked:
                return Response({"detail": blocked}, status=status.HTTP_400_BAD_REQUEST)
        questionnaire = serializer.save()
        return Response(QuestionnaireListSerializer(questionnaire).data)

    def delete(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        blocked = questionnaire_delete_blocked_reason(questionnaire)
        if blocked:
            return Response({"detail": blocked}, status=status.HTTP_400_BAD_REQUEST)
        questionnaire.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffQuestionnaireDuplicateQuestionnaireView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        serializer = QuestionnaireDuplicateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            clone = duplicate_questionnaire(
                questionnaire,
                created_by=request.user,
                slug=serializer.validated_data.get("slug") or None,
                title=serializer.validated_data.get("title") or None,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            QuestionnaireListSerializer(clone).data,
            status=status.HTTP_201_CREATED,
        )


class StaffQuestionnaireVersionListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        versions = questionnaire.versions.prefetch_related("steps__fields").order_by("-created_at")
        return Response(QuestionnaireVersionSerializer(versions, many=True).data)

    def post(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        label = (str(request.data.get("version_label", "")).strip() or "1.0.0")[:32]
        if QuestionnaireVersion.objects.filter(
            questionnaire=questionnaire,
            version_label=label,
        ).exists():
            return Response(
                {
                    "detail": (
                        f"A version of this questionnaire is already named "
                        f"“{label}”."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
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
        # Renaming is cosmetic metadata, allowed in any status. Schema/routing
        # edits below remain restricted to drafts.
        label = request.data.get("version_label")
        if label is not None:
            new_label = str(label).strip()[:32]
            if not new_label:
                return Response(
                    {"detail": "Version name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            clash = (
                QuestionnaireVersion.objects.filter(
                    questionnaire=version.questionnaire,
                    version_label=new_label,
                )
                .exclude(id=version.id)
                .exists()
            )
            if clash:
                return Response(
                    {
                        "detail": (
                            f"Another version of this questionnaire is already "
                            f"named “{new_label}”."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            version.version_label = new_label
            version.save(update_fields=["version_label", "updated_at"])

        non_label_keys = [
            k
            for k in ("intake_routing_rules", "cta_ids", "is_default_entry")
            if k in request.data
        ]
        if non_label_keys and version.status != QuestionnaireVersion.Status.DRAFT:
            return Response(
                {"detail": "Only draft versions can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        intake_rules = request.data.get("intake_routing_rules")
        if intake_rules is not None:
            if not isinstance(intake_rules, list):
                return Response(
                    {"detail": "intake_routing_rules must be a list."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cleaned = []
            for i, rule in enumerate(intake_rules):
                if not isinstance(rule, dict):
                    return Response(
                        {"detail": f"Rule {i} must be an object."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                cleaned.append(
                    {
                        "when_field": str(rule.get("when_field", "")).strip()[:64],
                        "when_value": str(rule.get("when_value", "")).strip()[:256],
                        "intake_questionnaire_slug": str(
                            rule.get("intake_questionnaire_slug", "")
                        ).strip()[:64],
                        "when_step": str(rule.get("when_step", "")).strip()[:64],
                    }
                )
            version.intake_routing_rules = cleaned
            version.save(update_fields=["intake_routing_rules", "updated_at"])

        cta_ids = request.data.get("cta_ids")
        if cta_ids is not None:
            if not isinstance(cta_ids, list):
                return Response(
                    {"detail": "cta_ids must be a list."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cleaned_ctas = []
            for c in cta_ids:
                value = str(c).strip()[:64]
                if value and value not in cleaned_ctas:
                    cleaned_ctas.append(value)
            # A draft may freely claim CTA ids even when they are still mapped to
            # a published qualify version. Saving the draft does NOT modify the
            # published version — the takeover (and archival of a published
            # version that loses its last CTA) happens only at publish time in
            # publish_version(). The UI surfaces ownership as an informational
            # warning so staff know what publishing will do.
            version.cta_ids = cleaned_ctas
            version.save(update_fields=["cta_ids", "updated_at"])

        is_default = request.data.get("is_default_entry")
        if is_default is not None:
            version.is_default_entry = bool(is_default)
            version.save(update_fields=["is_default_entry", "updated_at"])

        return Response(serialize_version(version))


    def delete(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        if version.status == QuestionnaireVersion.Status.PUBLISHED:
            return Response(
                {"detail": "Published versions cannot be deleted. Archive first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if version.status == QuestionnaireVersion.Status.ARCHIVED:
            if questionnaire_version_is_in_use(version.id):
                return Response(
                    {
                        "detail": (
                            "This archived version was used by patients and cannot be "
                            "deleted. Analytics and submission records reference it."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif version.status != QuestionnaireVersion.Status.DRAFT:
            return Response(
                {"detail": "Only draft or unused archived versions can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class StaffQuestionnaireArchiveView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        if version.status != QuestionnaireVersion.Status.PUBLISHED:
            return Response(
                {"detail": "Only published versions can be archived."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version.status = QuestionnaireVersion.Status.ARCHIVED
        version.is_default_entry = False
        version.save(update_fields=["status", "is_default_entry", "updated_at"])
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
        # Field keys must be unique across the whole version: patient answers are
        # stored in one flat map keyed by field_key, so a duplicate key on
        # another step would collide and mis-validate (e.g. a pill answer failing
        # an injection field's option check).
        field_key = serializer.validated_data.get("field_key")
        if field_key and QuestionnaireField.objects.filter(
            step__version_id=version_id, field_key=field_key
        ).exists():
            return Response(
                {
                    "field_key": "Another question in this questionnaire already uses that field ID."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
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
        new_key = serializer.validated_data.get("field_key")
        if new_key and new_key != field.field_key:
            if QuestionnaireField.objects.filter(
                step__version_id=version_id, field_key=new_key
            ).exclude(pk=field.pk).exists():
                return Response(
                    {
                        "field_key": "Another question in this questionnaire already uses that field ID."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
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

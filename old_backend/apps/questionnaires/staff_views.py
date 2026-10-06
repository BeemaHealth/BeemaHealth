from __future__ import annotations

import uuid

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff
from apps.questionnaires.models import (
    ApiVendor,
    ApiVendorVersion,
    Medication,
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)
from apps.questionnaires.serializers import (
    ApiVendorSerializer,
    ApiVendorVersionSerializer,
    ApiVendorVersionWriteSerializer,
    ApiVendorWriteSerializer,
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
    export_questionnaire_version_bundle,
    get_published_qualify_cta_ownership,
    import_questionnaire_version_bundle,
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
        versions = questionnaire.versions.select_related("vendor_version__vendor").prefetch_related("steps__fields").order_by("-created_at")
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


class StaffQuestionnaireVersionImportView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, slug: str):
        questionnaire = get_object_or_404(Questionnaire, slug=slug)
        bundle = request.data.get("bundle", request.data)
        version_label = request.data.get("version_label")
        try:
            version = import_questionnaire_version_bundle(
                questionnaire,
                bundle,
                created_by=request.user,
                version_label=version_label,
            )
        except (ValidationError, ValueError) as exc:
            detail = getattr(exc, "detail", None)
            return Response(
                detail if detail is not None else {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            QuestionnaireVersionSerializer(version).data,
            status=status.HTTP_201_CREATED,
        )


class StaffQuestionnaireVersionDetailView(APIView):
    permission_classes = [IsStaff]

    def _get_version(self, slug: str, version_id: uuid.UUID) -> QuestionnaireVersion:
        return get_object_or_404(
            QuestionnaireVersion.objects.select_related(
                "questionnaire", "vendor_version__vendor"
            ),
            id=version_id,
            questionnaire__slug=slug,
        )

    def get(self, request, slug: str, version_id: uuid.UUID):
        version = self._get_version(slug, version_id)
        return Response(serialize_version(version))

    def patch(self, request, slug: str, version_id: uuid.UUID):
        version = self._get_version(slug, version_id)
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

        if "vendor_version_id" in request.data:
            from apps.questionnaires.models import ApiVendorVersion
            raw = request.data["vendor_version_id"]
            if raw is None or raw == "":
                version.vendor_version = None
                version.save(update_fields=["vendor_version", "updated_at"])
            else:
                try:
                    vv = ApiVendorVersion.objects.get(id=raw, status=ApiVendorVersion.Status.PUBLISHED)
                except (ApiVendorVersion.DoesNotExist, Exception):
                    return Response(
                        {"detail": "Vendor version not found or not published."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                version.vendor_version = vv
                version.save(update_fields=["vendor_version", "updated_at"])

        return Response(serialize_version(version))


    def delete(self, request, slug: str, version_id: uuid.UUID):
        version = self._get_version(slug, version_id
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


class StaffQuestionnaireVersionExportView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, slug: str, version_id: uuid.UUID):
        version = get_object_or_404(
            QuestionnaireVersion,
            id=version_id,
            questionnaire__slug=slug,
        )
        return Response(export_questionnaire_version_bundle(version))


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


# ---------------------------------------------------------------------------
# API Vendor views
# ---------------------------------------------------------------------------


class StaffApiVendorListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        vendors = ApiVendor.objects.prefetch_related("versions").all()
        return Response(ApiVendorSerializer(vendors, many=True).data)

    def post(self, request):
        ser = ApiVendorWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vendor = ser.save()
        return Response(ApiVendorSerializer(vendor).data, status=status.HTTP_201_CREATED)


class StaffApiVendorDetailView(APIView):
    permission_classes = [IsStaff]

    def _get_vendor(self, vendor_id: uuid.UUID) -> ApiVendor:
        return get_object_or_404(ApiVendor, id=vendor_id)

    def get(self, request, vendor_id: uuid.UUID):
        vendor = self._get_vendor(vendor_id)
        return Response(ApiVendorSerializer(vendor).data)

    def patch(self, request, vendor_id: uuid.UUID):
        vendor = self._get_vendor(vendor_id)
        ser = ApiVendorWriteSerializer(vendor, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        vendor = ser.save()
        return Response(ApiVendorSerializer(vendor).data)

    def delete(self, request, vendor_id: uuid.UUID):
        vendor = self._get_vendor(vendor_id)
        vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffApiVendorVersionListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, vendor_id: uuid.UUID):
        vendor = get_object_or_404(ApiVendor, id=vendor_id)
        versions = vendor.versions.all()
        return Response(ApiVendorVersionSerializer(versions, many=True).data)

    def post(self, request, vendor_id: uuid.UUID):
        vendor = get_object_or_404(ApiVendor, id=vendor_id)
        # Auto-assign the next version_number
        last = vendor.versions.order_by("-version_number").first()
        next_number = (last.version_number + 1) if last else 1
        data = {**request.data, "vendor": str(vendor.id), "version_number": next_number}
        ser = ApiVendorVersionWriteSerializer(data=data)
        ser.is_valid(raise_exception=True)
        version = ser.save(vendor=vendor, version_number=next_number)
        return Response(ApiVendorVersionSerializer(version).data, status=status.HTTP_201_CREATED)


class StaffApiVendorVersionDetailView(APIView):
    permission_classes = [IsStaff]

    def _get_version(self, vendor_id: uuid.UUID, version_id: uuid.UUID) -> ApiVendorVersion:
        return get_object_or_404(ApiVendorVersion, id=version_id, vendor_id=vendor_id)

    def get(self, request, vendor_id: uuid.UUID, version_id: uuid.UUID):
        version = self._get_version(vendor_id, version_id)
        return Response(ApiVendorVersionSerializer(version).data)

    def patch(self, request, vendor_id: uuid.UUID, version_id: uuid.UUID):
        version = self._get_version(vendor_id, version_id)
        if version.status != ApiVendorVersion.Status.DRAFT:
            return Response(
                {"detail": "Only draft versions can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = ApiVendorVersionWriteSerializer(version, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        version = ser.save()
        return Response(ApiVendorVersionSerializer(version).data)

    def delete(self, request, vendor_id: uuid.UUID, version_id: uuid.UUID):
        version = self._get_version(vendor_id, version_id)
        if version.status == ApiVendorVersion.Status.PUBLISHED:
            return Response(
                {"detail": "Published versions cannot be deleted. Archive them instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffApiVendorVersionPublishView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, vendor_id: uuid.UUID, version_id: uuid.UUID):
        version = get_object_or_404(ApiVendorVersion, id=version_id, vendor_id=vendor_id)
        if version.status == ApiVendorVersion.Status.PUBLISHED:
            return Response(
                {"detail": "Version is already published."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version.status = ApiVendorVersion.Status.PUBLISHED
        version.published_at = timezone.now()
        version.save(update_fields=["status", "published_at", "updated_at"])
        return Response(ApiVendorVersionSerializer(version).data)


class StaffApiVendorVersionArchiveView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, vendor_id: uuid.UUID, version_id: uuid.UUID):
        version = get_object_or_404(ApiVendorVersion, id=version_id, vendor_id=vendor_id)
        if version.status == ApiVendorVersion.Status.ARCHIVED:
            return Response(
                {"detail": "Version is already archived."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version.status = ApiVendorVersion.Status.ARCHIVED
        version.save(update_fields=["status", "updated_at"])
        return Response(ApiVendorVersionSerializer(version).data)


class StaffApiVendorVersionUnarchiveView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, vendor_id: uuid.UUID, version_id: uuid.UUID):
        version = get_object_or_404(ApiVendorVersion, id=version_id, vendor_id=vendor_id)
        if version.status != ApiVendorVersion.Status.ARCHIVED:
            return Response(
                {"detail": "Only archived versions can be unarchived."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        version.status = ApiVendorVersion.Status.PUBLISHED
        version.save(update_fields=["status", "updated_at"])
        return Response(ApiVendorVersionSerializer(version).data)

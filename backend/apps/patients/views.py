from __future__ import annotations

import uuid
from typing import Any

from rest_framework import mixins, status, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient, get_patient_profile
from apps.audit.api import AuditedViewMixin
from apps.audit.services import log
from apps.common.utils import client_ip

from . import services
from .models import Address, Allergy, ConsentRecord, DataRequest, IdentityDocument, MedicalCondition, PatientMedication
from .serializers import (
    AddressSerializer,
    AllergySerializer,
    ConditionSerializer,
    ConsentSerializer,
    DataRequestSerializer,
    MedicationSerializer,
    PatientProfileSerializer,
    PresignSerializer,
)


class ProfileView(AuditedViewMixin, APIView):
    permission_classes = [IsPatient]

    def get(self, request: Request) -> Response:
        profile = get_patient_profile(request.user)
        self.audit("read", profile)
        return Response(PatientProfileSerializer(profile).data)

    def patch(self, request: Request) -> Response:
        profile = get_patient_profile(request.user)
        serializer = PatientProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.audit("update", profile, metadata={"fields": sorted(serializer.validated_data.keys())})
        return Response(serializer.data)


class PatientScopedViewSet(AuditedViewMixin, viewsets.ModelViewSet):
    """CRUD limited to rows owned by the logged in patient."""

    permission_classes = [IsPatient]
    model: Any = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return self.model.objects.filter(patient=get_patient_profile(self.request.user)).order_by("created_at")

    def perform_create(self, serializer) -> None:
        serializer.save(patient=get_patient_profile(self.request.user))
        self.audit("create", serializer.instance)


class AddressViewSet(PatientScopedViewSet):
    model = Address
    serializer_class = AddressSerializer


class AllergyViewSet(PatientScopedViewSet):
    model = Allergy
    serializer_class = AllergySerializer


class MedicationViewSet(PatientScopedViewSet):
    model = PatientMedication
    serializer_class = MedicationSerializer


class ConditionViewSet(PatientScopedViewSet):
    model = MedicalCondition
    serializer_class = ConditionSerializer


class ConsentViewSet(AuditedViewMixin, mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Consents can be listed and added, never changed or removed."""

    permission_classes = [IsPatient]
    serializer_class = ConsentSerializer

    def get_queryset(self):
        return ConsentRecord.objects.filter(patient=get_patient_profile(self.request.user)).order_by("accepted_at")

    def perform_create(self, serializer) -> None:
        data = serializer.validated_data
        serializer.instance = services.record_consent(
            get_patient_profile(self.request.user),
            data["kind"],
            data["version"],
            ip=client_ip(self.request),
            user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
        )
        self.audit("create", serializer.instance)


class DataRequestViewSet(AuditedViewMixin, mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsPatient]
    serializer_class = DataRequestSerializer

    def get_queryset(self):
        return DataRequest.objects.filter(patient=get_patient_profile(self.request.user)).order_by("-created_at")

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            instance = services.open_data_request(get_patient_profile(request.user), serializer.validated_data["kind"])
        except services.DuplicateDataRequest:
            return Response({"detail": "You already have an open request of this type."}, status=status.HTTP_409_CONFLICT)
        self.audit("create", instance)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)


class ExportView(AuditedViewMixin, APIView):
    permission_classes = [IsPatient]

    def get(self, request: Request) -> Response:
        profile = get_patient_profile(request.user)
        data = services.build_export(profile)
        self.audit("export", profile, metadata={"sections": sorted(data.keys())})
        response = Response(data)
        response["Cache-Control"] = "no-store"
        return response


class IdentityDocumentPresignView(AuditedViewMixin, APIView):
    """Stub: reserves a pending document row and key. Storage upload is not wired yet."""

    permission_classes = [IsPatient]

    def post(self, request: Request) -> Response:
        serializer = PresignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = get_patient_profile(request.user)
        key = f"identity/{profile.pk}/{uuid.uuid4()}"
        doc = IdentityDocument.objects.create(patient=profile, s3_key=key, kind=serializer.validated_data["kind"])
        self.audit("create", doc)
        return Response({"id": str(doc.pk), "s3_key": key, "upload_url": None, "stub": True}, status=status.HTTP_201_CREATED)

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsPatient, IsProvider
from apps.audit.services import log_audit_event
from apps.prescriptions.models import PatientPrescription
from apps.prescriptions.serializers import PatientPrescriptionSerializer
from apps.prescriptions.services import get_active_prescription


class PatientPrescriptionMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        prescription = get_active_prescription(request.user)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="patient_prescription",
            resource_id=str(prescription.id) if prescription else "none",
            request=request,
        )
        if prescription is None:
            return Response(None)
        return Response(PatientPrescriptionSerializer(prescription).data)


class PatientPrescriptionAdminView(APIView):
    permission_classes = [IsProvider]

    def get(self, request, patient_id):
        user = get_object_or_404(User, id=patient_id, is_patient=True)
        prescription = get_active_prescription(user)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="patient_prescription",
            resource_id=str(prescription.id) if prescription else str(user.id),
            request=request,
        )
        if prescription is None:
            return Response(None)
        return Response(PatientPrescriptionSerializer(prescription).data)

    def post(self, request, patient_id):
        return self._upsert(request, patient_id)

    def patch(self, request, patient_id):
        return self._upsert(request, patient_id, partial=True)

    def _upsert(self, request, patient_id, partial=False):
        user = get_object_or_404(User, id=patient_id, is_patient=True)
        prescription = get_active_prescription(user)
        if prescription is None:
            serializer = PatientPrescriptionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            prescription = serializer.save(
                user=user,
                prescribed_by=request.user,
                prescribed_at=timezone.now(),
            )
            status_code = status.HTTP_201_CREATED
        else:
            serializer = PatientPrescriptionSerializer(
                prescription, data=request.data, partial=partial
            )
            serializer.is_valid(raise_exception=True)
            prescription = serializer.save()
            status_code = status.HTTP_200_OK

        log_audit_event(
            user=request.user,
            action="create" if status_code == status.HTTP_201_CREATED else "update",
            resource_type="patient_prescription",
            resource_id=str(prescription.id),
            request=request,
        )
        return Response(
            PatientPrescriptionSerializer(prescription).data,
            status=status_code,
        )

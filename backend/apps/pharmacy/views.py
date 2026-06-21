import json

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsPatient, IsProvider
from apps.integrations.permissions import LifeFileWebhookPermission
from apps.pharmacy.models import PharmacyOrder
from apps.pharmacy.preflight import PreflightError
from apps.pharmacy.serializers import PharmacyOrderSerializer
from apps.pharmacy.services import (
    create_and_submit_pharmacy_order,
    get_latest_pharmacy_order_for_user,
    process_pharmacy_webhook,
)
from apps.prescriptions.models import PatientPrescription
from apps.prescriptions.services import get_active_prescription


class PharmacyOrderCreateView(APIView):
    permission_classes = [IsProvider]

    def post(self, request):
        prescription_id = request.data.get("prescription_id")
        patient_id = request.data.get("patient_id")
        partner = request.data.get("pharmacy_partner")

        if prescription_id:
            prescription = get_object_or_404(PatientPrescription, id=prescription_id)
        elif patient_id:
            user = get_object_or_404(User, id=patient_id, is_patient=True)
            prescription = get_active_prescription(user)
            if prescription is None:
                return Response(
                    {"detail": "No active prescription for patient."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"detail": "prescription_id or patient_id required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = create_and_submit_pharmacy_order(
                prescription=prescription,
                partner=partner,
                request=request,
            )
        except PreflightError as exc:
            return Response({"detail": exc.errors}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            PharmacyOrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class PharmacyOrderDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET" and self.kwargs.get("order_id"):
            return [IsProvider()]
        return super().get_permissions()

    def get(self, request, order_id):
        order = get_object_or_404(PharmacyOrder, id=order_id)
        return Response(PharmacyOrderSerializer(order).data)


class PharmacyOrderMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        order = get_latest_pharmacy_order_for_user(request.user)
        if order is None:
            return Response(None)
        return Response(PharmacyOrderSerializer(order).data)


class LifeFileWebhookView(APIView):
    permission_classes = [LifeFileWebhookPermission]
    authentication_classes = []

    def post(self, request):
        try:
            if isinstance(request.data, dict):
                payload = request.data
            else:
                payload = json.loads(request.body.decode("utf-8") or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
            return Response(
                {"detail": "Invalid JSON payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event = process_pharmacy_webhook(
                partner="medivera",
                payload=payload,
                request=request,
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            {"event_id": str(event.id), "processed": True},
            status=status.HTTP_200_OK,
        )

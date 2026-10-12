"""Patient scoped fulfillment API. Every queryset is filtered by the logged in patient."""
from __future__ import annotations

from typing import Any

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Order, Shipment
from .serializers import NextShipmentSerializer, OrderSerializer, RefillRequestSerializer, ShipmentSerializer

REFILL_MESSAGES = {
    "not_found": "We could not find that treatment.",
    "treatment_not_active": "Refills are only available for an active treatment.",
    "refill_in_progress": "A refill is already in progress.",
    "no_pharmacy": "Your refill cannot be processed yet. Please contact support.",
}


def _patient(request: Request) -> Any:
    from apps.accounts.permissions import get_patient_profile

    return get_patient_profile(request.user)


class PatientScopedMixin:
    permission_classes = [IsAuthenticated]

    def patient(self) -> Any:
        return _patient(self.request)  # type: ignore[attr-defined]


class OrderListView(PatientScopedMixin, generics.ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(treatment__patient=self.patient()).prefetch_related("shipments")


class OrderDetailView(PatientScopedMixin, generics.RetrieveAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(treatment__patient=self.patient()).prefetch_related("shipments")


class ShipmentListView(PatientScopedMixin, generics.ListAPIView):
    serializer_class = ShipmentSerializer

    def get_queryset(self):
        return Shipment.objects.filter(order__treatment__patient=self.patient())


class NextShipmentView(PatientScopedMixin, APIView):
    def get(self, request: Request) -> Response:
        upcoming = services.next_shipment(self.patient())
        if upcoming is None:
            return Response({"next_shipment": None})
        upcoming.batch.blocked_reason = upcoming.blocker
        return Response({"next_shipment": NextShipmentSerializer(upcoming.batch).data})


class RequestRefillView(PatientScopedMixin, APIView):
    def post(self, request: Request) -> Response:
        from apps.clinical.models import Treatment

        patient = self.patient()
        serializer = RefillRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        treatment = Treatment.objects.filter(pk=serializer.validated_data["treatment"], patient=patient).first()
        if treatment is None:
            return Response({"detail": REFILL_MESSAGES["not_found"], "code": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            order = services.request_refill(patient, treatment)
        except services.RefillCooldownActive as exc:
            return Response(
                {
                    "detail": "You requested a refill recently. If your medication has not arrived, contact support.",
                    "code": "refill_cooldown",
                    "cooldown": {"active": True, "hours_remaining": exc.hours_remaining},
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except services.RefillNotAllowed as exc:
            return Response(
                {"detail": REFILL_MESSAGES.get(exc.reason, "Refill not available."), "code": exc.reason},
                status=status.HTTP_409_CONFLICT,
            )
        _audit(request, order)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


def _audit(request: Request, order: Order) -> None:
    from apps.audit.services import log

    log(request, "create", order, metadata={"surface": "refill_request"})

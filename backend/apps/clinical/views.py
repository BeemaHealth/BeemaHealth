"""Patient scoped clinical API. Every queryset is filtered by the requesting patient."""
from __future__ import annotations

import uuid
from typing import Any

from django.http import Http404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient, get_patient_profile

from . import hooks, services
from .models import ActionItem, DoseLog, HealthMetric, Treatment, Visit
from .serializers import (
    ACTIVE_STATES,
    PAST_STATES,
    PENDING_STATES,
    ActionItemSerializer,
    DoseLogSerializer,
    HealthMetricSerializer,
    TreatmentDetailSerializer,
    TreatmentSerializer,
)

TAB_STATES = {"active": ACTIVE_STATES, "pending": PENDING_STATES, "past": PAST_STATES}


class Pager(LimitOffsetPagination):
    default_limit = 100
    max_limit = 500


class PatientScopedMixin:
    """Resolves the patient once per request and logs PHI access."""

    permission_classes = [IsPatient]

    def patient(self) -> Any:
        return get_patient_profile(self.request.user)

    def get_serializer_context(self) -> dict[str, Any]:
        context = super().get_serializer_context()  # type: ignore[misc]
        context["patient"] = self.patient()
        return context

    def audit(self, action: str, obj: Any = None, resource: str = "") -> None:
        patient = self.patient()
        hooks.audit_log(self.request, action, obj or patient, patient_id=patient.pk, metadata={"resource": resource})


class TreatmentListView(PatientScopedMixin, generics.ListAPIView):
    """Treatments for the Active and Pending tabs. ``?tab=active|pending|past`` (default: all)."""

    serializer_class = TreatmentSerializer
    pagination_class = Pager

    def get_queryset(self):
        qs = Treatment.objects.filter(patient=self.patient()).select_related("product", "plan").prefetch_related("plan__phases", "dose_logs")
        tab = self.request.query_params.get("tab", "")
        if tab in TAB_STATES:
            qs = qs.filter(status__in=TAB_STATES[tab])
        return qs.order_by("-created_at")

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        self.audit("read", resource="treatments")
        return super().list(request, *args, **kwargs)


class TreatmentDetailView(PatientScopedMixin, generics.RetrieveAPIView):
    serializer_class = TreatmentDetailSerializer

    def get_queryset(self):
        return (
            Treatment.objects.filter(patient=self.patient())
            .select_related("product", "plan")
            .prefetch_related("visits", "prescriptions", "plan__phases", "dose_logs")
        )

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        instance = self.get_object()
        self.audit("read", instance, resource="treatment")
        return Response(self.get_serializer(instance).data)


class TreatmentCancelView(PatientScopedMixin, APIView):
    """Cancel before the visit is submitted to the doctor network. Refunded in full."""

    def post(self, request: Request, pk: str) -> Response:
        try:
            treatment = Treatment.objects.get(pk=pk, patient=self.patient())
        except Treatment.DoesNotExist as exc:
            raise Http404 from exc
        try:
            services.cancel_treatment(treatment, actor=request.user)
        except services.InvalidTransition:
            return Response(
                {"detail": "This treatment has been sent to your provider and can no longer be canceled."},
                status=status.HTTP_409_CONFLICT,
            )
        self.audit("update", treatment, resource="treatment_cancel")
        return Response(TreatmentSerializer(treatment, context={"request": request, "patient": self.patient()}).data)


class DoseLogListCreateView(PatientScopedMixin, generics.ListCreateAPIView):
    """Doses for the patient. Filters: ``treatment``, ``status``, ``overdue=1``."""

    serializer_class = DoseLogSerializer
    pagination_class = Pager

    def get_queryset(self):
        qs = DoseLog.objects.filter(treatment__patient=self.patient())
        params = self.request.query_params
        if params.get("treatment"):
            qs = qs.filter(treatment_id=params["treatment"]) if _is_uuid(params["treatment"]) else qs.none()
        if params.get("status") in DoseLog.Status.values:
            qs = qs.filter(status=params["status"])
        if params.get("overdue") == "1":
            qs = qs.filter(status=DoseLog.Status.SCHEDULED, scheduled_at__lt=timezone.now())
        return qs

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        self.audit("read", resource="dose_logs")
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer: DoseLogSerializer) -> None:
        instance = serializer.save(entered_by=DoseLog.EnteredBy.PATIENT)
        self.audit("create", instance, resource="dose_log")


class DoseLogDetailView(PatientScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    """Read, edit (including backfill of an overdue dose) or delete a dose the patient added."""

    serializer_class = DoseLogSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return DoseLog.objects.filter(treatment__patient=self.patient())

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        instance = self.get_object()
        self.audit("read", instance, resource="dose_log")
        return Response(self.get_serializer(instance).data)

    def perform_update(self, serializer: DoseLogSerializer) -> None:
        instance = serializer.save(entered_by=DoseLog.EnteredBy.PATIENT)
        self.audit("update", instance, resource="dose_log")

    def perform_destroy(self, instance: DoseLog) -> None:
        if instance.auto_generated or instance.entered_by == DoseLog.EnteredBy.STAFF:
            raise PermissionDenied("This dose is part of your schedule. Mark it skipped instead of deleting it.")
        self.audit("delete", instance, resource="dose_log")
        instance.delete()


class HealthMetricListCreateView(PatientScopedMixin, generics.ListCreateAPIView):
    serializer_class = HealthMetricSerializer
    pagination_class = Pager

    def get_queryset(self):
        qs = HealthMetric.objects.filter(patient=self.patient())
        kind = self.request.query_params.get("kind")
        if kind in HealthMetric.Kind.values:
            qs = qs.filter(kind=kind)
        return qs

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        self.audit("read", resource="health_metrics")
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer: HealthMetricSerializer) -> None:
        instance = serializer.save(patient=self.patient())
        self.audit("create", instance, resource="health_metric")


class HealthMetricDetailView(PatientScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HealthMetricSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return HealthMetric.objects.filter(patient=self.patient())

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        instance = self.get_object()
        self.audit("read", instance, resource="health_metric")
        return Response(self.get_serializer(instance).data)

    def perform_update(self, serializer: HealthMetricSerializer) -> None:
        instance = serializer.save()
        self.audit("update", instance, resource="health_metric")

    def perform_destroy(self, instance: HealthMetric) -> None:
        self.audit("delete", instance, resource="health_metric")
        instance.delete()


class ActionItemListView(PatientScopedMixin, generics.ListAPIView):
    """Open action items by default. ``?all=1`` includes resolved ones."""

    serializer_class = ActionItemSerializer
    pagination_class = Pager

    def get_queryset(self):
        qs = ActionItem.objects.filter(patient=self.patient())
        if self.request.query_params.get("all") != "1":
            qs = qs.filter(is_open=True)
        return qs

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        self.audit("read", resource="action_items")
        return super().list(request, *args, **kwargs)


class HomeView(PatientScopedMixin, APIView):
    """Home summary: quick actions, upcoming dates, treatment cards and health records."""

    def get(self, request: Request) -> Response:
        patient = self.patient()
        ctx = {"request": request, "patient": patient}
        now = timezone.now()
        treatments = list(
            Treatment.objects.filter(patient=patient, status__in=ACTIVE_STATES + PENDING_STATES)
            .select_related("product", "plan")
            .prefetch_related("plan__phases", "dose_logs")
            .order_by("-created_at")
        )
        action_items = list(ActionItem.objects.filter(patient=patient, is_open=True))

        doses = DoseLog.objects.filter(treatment__patient=patient, status=DoseLog.Status.SCHEDULED)
        overdue_count = doses.filter(scheduled_at__lt=now).count()
        next_dose = doses.filter(scheduled_at__gte=now).order_by("scheduled_at").first()
        next_visit = (
            Visit.objects.filter(treatment__patient=patient, scheduled_at__gte=now)
            .exclude(status__in=[Visit.Status.CANCELED, Visit.Status.NO_SHOW])
            .order_by("scheduled_at")
            .first()
        )

        quick_actions = [
            {"kind": item.kind, "label": item.title, "treatment_id": str(item.treatment_id) if item.treatment_id else None}
            for item in action_items
        ]
        if overdue_count:
            quick_actions.append({"kind": "log_dose", "label": "Log a missed dose", "treatment_id": None})
        elif any(t.status in ACTIVE_STATES for t in treatments):
            quick_actions.append({"kind": "log_dose", "label": "Log a dose", "treatment_id": None})
        if any(t.status == Treatment.Status.REFILL_DUE for t in treatments):
            quick_actions.append({"kind": "request_refill", "label": "Request a refill", "treatment_id": None})

        weights = list(HealthMetric.objects.filter(patient=patient, kind=HealthMetric.Kind.WEIGHT).order_by("on_date")[:1000])
        latest_weight = weights[-1] if weights else None
        first_weight = weights[0] if weights else None
        health_records = {
            "latest_weight_lbs": str(latest_weight.value) if latest_weight else None,
            "latest_weight_on": latest_weight.on_date.isoformat() if latest_weight else None,
            "weight_change_lbs": (
                str(latest_weight.value - first_weight.value) if latest_weight and first_weight and latest_weight is not first_weight else None
            ),
            "metric_count": HealthMetric.objects.filter(patient=patient).count(),
            "doses_taken": DoseLog.objects.filter(treatment__patient=patient, status=DoseLog.Status.TAKEN).count(),
        }
        self.audit("read", patient, resource="home")
        return Response(
            {
                "quick_actions": quick_actions,
                "action_items": ActionItemSerializer(action_items, many=True).data,
                "upcoming": {
                    "next_dose_at": next_dose.scheduled_at if next_dose else None,
                    "next_visit_at": next_visit.scheduled_at if next_visit else None,
                    "overdue_doses": overdue_count,
                },
                "treatments": TreatmentSerializer(treatments, many=True, context=ctx).data,
                "health_records": health_records,
            }
        )


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True

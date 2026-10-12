"""Patient facing serializers. Querysets are always scoped to the requesting patient."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from . import services
from .models import ActionItem, DoseLog, HealthMetric, Prescription, Treatment, Visit

S = Treatment.Status
ACTIVE_STATES = (S.PRESCRIBED, S.ACTIVE, S.REFILL_DUE, S.PAUSED)
PENDING_STATES = (
    S.QUESTIONNAIRE_IN_PROGRESS,
    S.AWAITING_PAYMENT,
    S.AWAITING_VISIT_COMPLETION,
    S.ROUTING_REVIEW,
    S.PENDING_VISIT,
    S.NEEDS_PATIENT_ACTION,
)
PAST_STATES = (S.NOT_ELIGIBLE, S.CANCELED, S.REFERRED, S.ENDED)
FUTURE_TOLERANCE = timedelta(minutes=5)


def tab_for(status: str) -> str:
    """Treatments page tab for a status: active, pending or past."""
    if status in ACTIVE_STATES:
        return "active"
    if status in PENDING_STATES:
        return "pending"
    return "past"


class VisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = ["id", "kind", "status", "scheduled_at", "video_location", "outcome", "submitted_at", "concluded_at", "doctor_name"]
        read_only_fields = fields


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ["id", "drug", "strength", "quantity", "refills", "prescriber_name", "written_at", "expires_at"]
        read_only_fields = fields


class TreatmentSerializer(serializers.ModelSerializer):
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    plan_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    tab = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    product_neutral_label = serializers.CharField(source="product.neutral_label", read_only=True)
    term_months = serializers.SerializerMethodField()
    ship_interval_months = serializers.SerializerMethodField()
    dose_interval_days = serializers.SerializerMethodField()
    next_dose_at = serializers.SerializerMethodField()

    class Meta:
        model = Treatment
        fields = [
            "id", "product_slug", "product_name", "product_neutral_label", "plan_name", "term_months",
            "ship_interval_months", "dose_interval_days", "next_dose_at", "status", "status_label", "tab",
            "requested_dose_label", "requested_strength_mg", "prescribed_strength_mg", "dose_changed_by_doctor",
            "titration_level", "can_cancel", "started_at", "ended_at", "created_at",
        ]
        read_only_fields = fields

    def get_plan_name(self, obj: Treatment) -> str:
        return obj.plan.name if obj.plan_id else ""

    def get_term_months(self, obj: Treatment) -> int | None:
        return obj.plan.term_months if obj.plan_id else None

    def get_ship_interval_months(self, obj: Treatment) -> int | None:
        return obj.plan.ship_interval_months if obj.plan_id else None

    def get_dose_interval_days(self, obj: Treatment) -> int | None:
        """Interval of the plan phase in effect (by months since start), None when the plan has no phases."""
        if not obj.plan_id:
            return None
        phases = sorted(obj.plan.phases.all(), key=lambda p: p.sequence)
        if not phases:
            return None
        month = max(0, (timezone.now() - obj.started_at).days // 30) if obj.started_at else 0
        current = phases[0]
        for phase in phases:
            if month >= phase.start_month:
                current = phase
        return current.dose_interval_days

    def get_next_dose_at(self, obj: Treatment):
        doses = [d.scheduled_at for d in obj.dose_logs.all() if d.status == DoseLog.Status.SCHEDULED]
        return min(doses) if doses else None

    def get_tab(self, obj: Treatment) -> str:
        return tab_for(obj.status)

    def get_can_cancel(self, obj: Treatment) -> bool:
        return services.can_cancel(obj)


class TreatmentDetailSerializer(TreatmentSerializer):
    visits = VisitSerializer(many=True, read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    next_dose = serializers.SerializerMethodField()

    class Meta(TreatmentSerializer.Meta):
        fields = TreatmentSerializer.Meta.fields + ["visits", "prescriptions", "next_dose"]
        read_only_fields = fields

    def get_next_dose(self, obj: Treatment) -> dict | None:
        doses = [d for d in obj.dose_logs.all() if d.status == DoseLog.Status.SCHEDULED]
        dose = min(doses, key=lambda d: d.scheduled_at) if doses else None
        return DoseLogSerializer(dose).data if dose else None


class ActionItemSerializer(serializers.ModelSerializer):
    treatment_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ActionItem
        fields = ["id", "treatment_id", "kind", "title", "body", "is_open", "resolved_at", "created_at"]
        read_only_fields = fields


class DoseLogSerializer(serializers.ModelSerializer):
    treatment = serializers.PrimaryKeyRelatedField(queryset=Treatment.objects.none())
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = DoseLog
        fields = [
            "id", "treatment", "scheduled_at", "taken_at", "status", "strength_mg", "dose_number",
            "injection_site", "pain_0_5", "notes", "entered_by", "auto_generated", "is_overdue", "created_at",
        ]
        read_only_fields = ["id", "entered_by", "auto_generated", "dose_number", "is_overdue", "created_at"]
        extra_kwargs = {
            "scheduled_at": {"required": False},
            "notes": {"max_length": 2000, "allow_blank": True},
            "injection_site": {"max_length": 50},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        patient = self.context.get("patient")
        if patient is not None:
            self.fields["treatment"].queryset = Treatment.objects.filter(
                patient=patient, status__in=ACTIVE_STATES
            )
        if self.instance is not None and not isinstance(self.instance, (list, tuple)) and hasattr(self.instance, "pk"):
            self.fields["treatment"].read_only = True

    def get_is_overdue(self, obj: DoseLog) -> bool:
        return obj.status == DoseLog.Status.SCHEDULED and obj.scheduled_at < timezone.now()

    def validate_strength_mg(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value <= 0:
            raise serializers.ValidationError("Strength must be greater than zero.")
        return value

    def validate(self, attrs: dict) -> dict:
        instance = self.instance
        status = attrs.get("status", instance.status if instance else DoseLog.Status.SCHEDULED)
        taken_at = attrs.get("taken_at", instance.taken_at if instance else None)
        now = timezone.now()
        if status == DoseLog.Status.TAKEN:
            taken_at = taken_at or now
            attrs["taken_at"] = taken_at
        elif taken_at is not None:
            raise serializers.ValidationError({"taken_at": "Only a taken dose can have a taken time."})
        if taken_at is not None and taken_at > now + FUTURE_TOLERANCE:
            raise serializers.ValidationError({"taken_at": "A dose cannot be logged in the future."})
        if instance is None and "scheduled_at" not in attrs:
            attrs["scheduled_at"] = taken_at or now
        if instance is not None and instance.entered_by == DoseLog.EnteredBy.STAFF:
            raise serializers.ValidationError("This entry was made by staff and cannot be edited.")
        return attrs


class HealthMetricSerializer(serializers.ModelSerializer):
    LIMITS = {
        HealthMetric.Kind.WEIGHT: (Decimal("50"), Decimal("1000"), "lbs"),
        HealthMetric.Kind.CALORIES: (Decimal("0"), Decimal("20000"), "kcal"),
        HealthMetric.Kind.EXERCISE: (Decimal("0"), Decimal("1440"), "minutes"),
        HealthMetric.Kind.SIDE_EFFECT: (Decimal("0"), Decimal("5"), "severity_0_5"),
    }

    class Meta:
        model = HealthMetric
        fields = ["id", "kind", "on_date", "value", "unit", "notes", "created_at"]
        read_only_fields = ["id", "unit", "created_at"]
        extra_kwargs = {"notes": {"max_length": 2000, "allow_blank": True}}

    def validate_on_date(self, value):
        if value > timezone.localdate() + timedelta(days=1):
            raise serializers.ValidationError("Date cannot be in the future.")
        return value

    def validate(self, attrs: dict) -> dict:
        kind = attrs.get("kind", self.instance.kind if self.instance else None)
        value = attrs.get("value", self.instance.value if self.instance else None)
        low, high, unit = self.LIMITS[kind]
        if value is not None and not (low <= value <= high):
            raise serializers.ValidationError({"value": f"Enter a value between {low} and {high}."})
        attrs["unit"] = unit
        return attrs

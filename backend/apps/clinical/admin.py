from django.contrib import admin, messages
from django.utils import timezone

from apps.routing.models import RoutingDecision

from .models import ActionItem, DoseLog, DrugIneligibility, HealthMetric, Prescription, Treatment, Visit

try:
    from apps.audit.mixins import AuditedAdminMixin
except ImportError:  # audit app not installed yet

    class AuditedAdminMixin:  # type: ignore[no-redef]
        """Fallback when the audit app is unavailable."""

BASE_READONLY = ("id", "created_at", "updated_at")


class VisitInline(admin.TabularInline):
    model = Visit
    extra = 0
    fields = ("kind", "external_id", "status", "outcome", "scheduled_at", "submitted_at", "concluded_at", "doctor_name")
    readonly_fields = ("submitted_at", "concluded_at")
    show_change_link = True


class PrescriptionInline(admin.TabularInline):
    model = Prescription
    extra = 0
    fields = ("drug", "strength", "quantity", "refills", "prescriber_name", "external_rx_id", "written_at", "expires_at")
    show_change_link = True


class DoseLogInline(admin.TabularInline):
    model = DoseLog
    extra = 0
    fields = ("dose_number", "scheduled_at", "taken_at", "status", "strength_mg", "entered_by")
    show_change_link = True


class ActionItemInline(admin.TabularInline):
    model = ActionItem
    extra = 0
    fields = ("kind", "title", "is_open", "resolved_at")
    show_change_link = True


class RoutingDecisionInline(admin.TabularInline):
    model = RoutingDecision
    extra = 0
    can_delete = False
    fields = ("result", "rule", "flag_reason", "inputs", "resolved_by", "resolved_at", "created_at")
    readonly_fields = fields
    show_change_link = True

    def has_add_permission(self, request, obj=None) -> bool:
        return False


@admin.register(Treatment)
class TreatmentAdmin(AuditedAdminMixin, admin.ModelAdmin):
    list_display = ("id", "status", "product", "plan", "patient", "dose_changed_by_doctor", "submitted_to_network_at", "created_at")
    list_filter = ("status", "product", "dose_changed_by_doctor", "network", "pharmacy")
    search_fields = ("id", "patient__id", "patient__user__email", "visits__external_id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patient", "plan", "variant", "submission")
    date_hierarchy = "created_at"
    inlines = [VisitInline, PrescriptionInline, DoseLogInline, ActionItemInline, RoutingDecisionInline]


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("id", "treatment", "kind", "status", "outcome", "external_id", "scheduled_at")
    list_filter = ("kind", "status", "outcome")
    search_fields = ("id", "external_id", "treatment__id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("treatment",)


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "treatment", "drug", "strength", "quantity", "refills", "written_at")
    list_filter = ("drug",)
    search_fields = ("id", "external_rx_id", "external_med_id", "treatment__id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("treatment", "visit")


@admin.register(ActionItem)
class ActionItemAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "title", "patient", "treatment", "is_open", "created_at")
    list_filter = ("kind", "is_open")
    search_fields = ("id", "patient__id", "treatment__id", "title")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patient", "treatment")


class IneligibilityStatusFilter(admin.SimpleListFilter):
    title = "block status"
    parameter_name = "block"

    def lookups(self, request, model_admin):
        return [("active", "Active (patient is blocked)"), ("lifted", "Lifted by staff")]

    def queryset(self, request, queryset):
        if self.value() == "active":
            return queryset.filter(lifted_at__isnull=True)
        if self.value() == "lifted":
            return queryset.filter(lifted_at__isnull=False)
        return queryset


@admin.action(description="Lift selected ineligibilities (patient may start this drug again)")
def lift_ineligibility(modeladmin, request, queryset) -> None:
    lifted = queryset.filter(lifted_at__isnull=True).update(
        lifted_by=request.user, lifted_at=timezone.now(), updated_at=timezone.now()
    )
    modeladmin.message_user(request, f"Lifted {lifted} ineligibilities.", messages.INFO)


@admin.register(DrugIneligibility)
class DrugIneligibilityAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "product", "drug", "reason", "lifted_at", "created_at")
    list_filter = (IneligibilityStatusFilter, "product", "drug", "reason")
    actions = [lift_ineligibility]
    search_fields = ("id", "patient__id", "drug")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patient", "source_treatment", "lifted_by")


@admin.register(DoseLog)
class DoseLogAdmin(AuditedAdminMixin, admin.ModelAdmin):
    list_display = ("id", "treatment", "dose_number", "scheduled_at", "taken_at", "status", "strength_mg", "entered_by")
    list_filter = ("status", "entered_by", "auto_generated")
    search_fields = ("id", "treatment__id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("treatment",)
    date_hierarchy = "scheduled_at"


@admin.register(HealthMetric)
class HealthMetricAdmin(AuditedAdminMixin, admin.ModelAdmin):
    list_display = ("id", "patient", "kind", "on_date", "value", "unit")
    list_filter = ("kind",)
    search_fields = ("id", "patient__id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patient",)
    date_hierarchy = "on_date"

from django.contrib import admin, messages

from . import engine
from .models import ReplacementRule, RoutingDecision, RoutingReviewItem, RoutingRule

BASE_READONLY = ("id", "created_at", "updated_at")


@admin.register(RoutingRule)
class RoutingRuleAdmin(admin.ModelAdmin):
    list_display = (
        "name", "priority", "is_active", "product", "states_mode", "fill_type", "network", "pharmacy",
        "dose_min_mg", "dose_max_mg", "orders_per_day_threshold",
    )
    list_filter = ("is_active", "states_mode", "fill_type", "product", "network", "pharmacy", "route_errors_only", "refill_only")
    search_fields = ("name", "id")
    readonly_fields = BASE_READONLY


@admin.register(ReplacementRule)
class ReplacementRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "source_variant", "source_pharmacy", "target_variant", "target_pharmacy", "is_active", "refill_only", "route_errors_only")
    list_filter = ("is_active", "refill_only", "route_errors_only", "source_pharmacy", "target_pharmacy")
    search_fields = ("id", "source_variant__slug", "target_variant__slug")
    readonly_fields = BASE_READONLY


@admin.action(description="Re-run routing for selected flagged decisions")
def rerun_routing(modeladmin, request, queryset) -> None:
    routed = flagged = skipped = 0
    for decision in queryset.select_related("treatment"):
        try:
            new = engine.rerun(decision, request.user)
        except ValueError:
            skipped += 1
            continue
        if new.result == RoutingDecision.Result.ROUTED:
            routed += 1
        else:
            flagged += 1
    modeladmin.message_user(
        request, f"Routed {routed}, still flagged {flagged}, skipped {skipped} already resolved.", messages.INFO
    )


@admin.register(RoutingDecision)
class RoutingDecisionAdmin(admin.ModelAdmin):
    list_display = ("id", "treatment", "result", "rule", "flag_reason", "resolved_at", "created_at")
    list_filter = ("result", "flag_reason", "rule")
    search_fields = ("id", "treatment__id")
    readonly_fields = BASE_READONLY + ("inputs",)
    raw_id_fields = ("treatment", "resolved_by")
    date_hierarchy = "created_at"
    actions = [rerun_routing]


@admin.register(RoutingReviewItem)
class RoutingReviewQueueAdmin(RoutingDecisionAdmin):
    """Staff queue: flagged decisions nobody has resolved. Fix rules, then re-run routing."""

    list_filter = ("flag_reason",)

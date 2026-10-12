from django.contrib import admin, messages

from apps.audit.services import log as audit_log

from . import services
from .models import CareEvent, Order, Shipment, ShipmentBatch

RO = ("id", "created_at", "updated_at")


class ShipmentInline(admin.TabularInline):
    model = Shipment
    extra = 0
    readonly_fields = RO


class OrderInline(admin.TabularInline):
    model = Order
    fk_name = "batch"
    extra = 0
    fields = ("id", "status", "fill_type", "external_order_id", "pharmacy")
    readonly_fields = RO
    show_change_link = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "treatment", "pharmacy", "status", "fill_type", "external_order_id", "submitted_at", "created_at")
    list_filter = ("status", "fill_type", "pharmacy")
    search_fields = ("id", "external_order_id", "treatment__id")
    readonly_fields = RO
    raw_id_fields = ("treatment", "prescription", "subscription", "batch")
    inlines = [ShipmentInline]
    actions = ["submit_to_pharmacy"]
    date_hierarchy = "created_at"

    @admin.action(description="Submit selected pending orders to the pharmacy")
    def submit_to_pharmacy(self, request, queryset):
        sent = 0
        for order in queryset.filter(status__in=["pending", "failed"]):
            try:
                services.submit_order(order)
                audit_log(request, "update", order, reason="submit_to_pharmacy")
                sent += 1
            except Exception as exc:  # noqa: BLE001 - show the safe class name, never details
                self.message_user(request, f"Order {order.pk}: {type(exc).__name__}", messages.ERROR)
        self.message_user(request, f"Submitted {sent} order(s).")


@admin.register(ShipmentBatch)
class ShipmentBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "subscription", "sequence", "due_on", "supply_days", "status", "released_at")
    list_filter = ("status", "due_on")
    search_fields = ("id", "subscription__id")
    readonly_fields = RO + ("released_at",)
    raw_id_fields = ("subscription", "order")
    inlines = [OrderInline]
    actions = ["release_selected", "skip_selected"]

    @admin.action(description="Release selected batches (rules apply)")
    def release_selected(self, request, queryset):
        released = 0
        for batch in queryset:
            try:
                services.release_batch(batch, actor=request.user)
                released += 1
            except services.ReleaseBlocked as exc:
                self.message_user(request, f"Batch {batch.pk}: blocked ({exc.reason})", messages.WARNING)
        self.message_user(request, f"Released {released} batch(es).")

    @admin.action(description="Mark selected batches skipped")
    def skip_selected(self, request, queryset):
        count = queryset.filter(status__in=["scheduled", "released"]).update(status="skipped")
        self.message_user(request, f"Skipped {count} batch(es).")


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "carrier", "tracking_number", "status", "shipped_at", "delivered_on")
    list_filter = ("status", "carrier")
    search_fields = ("id", "tracking_number", "order__id")
    readonly_fields = RO
    raw_id_fields = ("order",)


@admin.register(CareEvent)
class CareEventAdmin(admin.ModelAdmin):
    """Append only timeline. Read-only for everyone, including superusers."""

    list_display = ("id", "source", "event", "treatment", "patient", "occurred_at")
    list_filter = ("source", "event")
    search_fields = ("id", "event", "treatment__id", "patient__id")
    readonly_fields = ("id", "treatment", "patient", "source", "event", "payload_redacted", "occurred_at", "created_at", "updated_at")
    date_hierarchy = "occurred_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

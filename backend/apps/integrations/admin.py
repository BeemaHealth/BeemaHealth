import json

from django.contrib import admin, messages
from django.utils import timezone

from apps.audit.mixins import AuditedAdminMixin
from apps.audit.services import log as audit_log

from .models import InboundEvent, OutboundCall
from .webhooks import process


class ReadOnlyAdmin(admin.ModelAdmin):
    """Vendor owned records: viewable, never editable or deletable through admin."""

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(InboundEvent)
class InboundEventAdmin(AuditedAdminMixin, ReadOnlyAdmin):
    list_display = ("id", "vendor", "event_type", "external_ref", "status", "attempts", "received_at", "processed_at")
    list_filter = ("vendor", "status", "event_type")
    search_fields = ("id", "external_ref", "event_type", "dedupe_key")
    date_hierarchy = "received_at"
    actions = ["replay", "mark_ignored"]

    def get_fields(self, request, obj=None):
        fields = [
            "id", "vendor", "event_type", "external_ref", "dedupe_key", "status", "attempts", "last_error",
            "received_at", "processed_at", "next_attempt_at", "created_at", "updated_at",
        ]
        if request.user.is_superuser:
            fields.append("payload_display")
        return fields

    def get_readonly_fields(self, request, obj=None):
        return self.get_fields(request, obj)

    @admin.display(description="Raw payload (may contain PHI)")
    def payload_display(self, obj):
        return json.dumps(obj.raw_payload, indent=2, sort_keys=True)

    def _may_act(self, request) -> bool:
        return request.user.is_superuser or request.user.has_perm("integrations.change_inboundevent")

    @admin.action(description="Replay selected events (reset and process now)")
    def replay(self, request, queryset):
        if not self._may_act(request):
            self.message_user(request, "You do not have permission to replay events.", messages.ERROR)
            return
        done = 0
        for event in queryset.exclude(status="processed"):
            event.status, event.attempts, event.last_error, event.next_attempt_at = "received", 0, "", None
            event.save(update_fields=["status", "attempts", "last_error", "next_attempt_at", "updated_at"])
            result = process(event)
            audit_log(request, "update", event, reason="replay", metadata={"result": result.status})
            done += 1
        self.message_user(request, f"Replayed {done} event(s). Already processed events are skipped.")

    @admin.action(description="Mark selected events ignored")
    def mark_ignored(self, request, queryset):
        if not self._may_act(request):
            self.message_user(request, "You do not have permission to ignore events.", messages.ERROR)
            return
        count = 0
        for event in queryset.exclude(status="processed"):
            event.status, event.processed_at, event.next_attempt_at = "ignored", timezone.now(), None
            event.save(update_fields=["status", "processed_at", "next_attempt_at", "updated_at"])
            audit_log(request, "update", event, reason="mark_ignored")
            count += 1
        self.message_user(request, f"Marked {count} event(s) ignored.")


@admin.register(OutboundCall)
class OutboundCallAdmin(ReadOnlyAdmin):
    list_display = ("id", "vendor", "endpoint_name", "ok", "status_code", "attempts", "duration_ms", "created_at")
    list_filter = ("vendor", "ok", "endpoint_name")
    search_fields = ("id", "endpoint_name", "treatment__id", "error")
    readonly_fields = (
        "id", "vendor", "endpoint_name", "treatment", "request_summary", "status_code", "ok", "attempts",
        "error", "duration_ms", "created_at", "updated_at",
    )
    raw_id_fields = ("treatment",)
    date_hierarchy = "created_at"

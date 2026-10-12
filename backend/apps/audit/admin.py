from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    """Read-only: audit events are append only."""

    list_display = ("created_at", "action", "object_type", "object_id", "actor_label", "patient_id", "ip")
    list_filter = ("action", "object_type")
    search_fields = ("actor_label", "object_id", "patient_id", "object_type", "reason")
    date_hierarchy = "created_at"
    readonly_fields = [f.name for f in AuditEvent._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

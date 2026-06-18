from django.contrib import admin

from apps.audit.models import AuditEvent
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(AuditEvent)
    fields = all_model_fields(AuditEvent)
    readonly_fields = auto_readonly_fields(AuditEvent)
    search_fields = ("id", "user__email", "resource_type", "resource_id", "ip_address", "user_agent")

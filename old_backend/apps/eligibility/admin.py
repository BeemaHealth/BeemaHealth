from django.contrib import admin

from apps.eligibility.models import EligibilityResponse, FunnelSession
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(FunnelSession)
class FunnelSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "claimed_by_user", "utm_source", "utm_campaign", "landing_page_slug", "ip_address", "created_at")
    list_filter = ("status", "utm_source", "created_at")
    search_fields = ("id", "claimed_by_user__email", "ip_address", "utm_source", "utm_campaign", "landing_page_slug")
    readonly_fields = auto_readonly_fields(FunnelSession)
    fields = all_model_fields(FunnelSession)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"


@admin.register(EligibilityResponse)
class EligibilityResponseAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(EligibilityResponse)
    fields = all_model_fields(EligibilityResponse)
    readonly_fields = auto_readonly_fields(EligibilityResponse)
    search_fields = ("id", "user__email", "state", "disqualification_reason")

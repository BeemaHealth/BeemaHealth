from django.contrib import admin

from apps.eligibility.models import EligibilityResponse, FunnelSession
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(FunnelSession)
class FunnelSessionAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(FunnelSession)
    fields = all_model_fields(FunnelSession)
    readonly_fields = auto_readonly_fields(FunnelSession)
    search_fields = ("id", "token_hash", "claimed_by_user__email", "ip_address", "user_agent")


@admin.register(EligibilityResponse)
class EligibilityResponseAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(EligibilityResponse)
    fields = all_model_fields(EligibilityResponse)
    readonly_fields = auto_readonly_fields(EligibilityResponse)
    search_fields = ("id", "user__email", "state", "disqualification_reason")

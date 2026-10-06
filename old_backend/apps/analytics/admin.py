from django.contrib import admin
from django.utils.html import format_html

from apps.analytics.models import FunnelEvent, LandingPage
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(FunnelEvent)
class FunnelEventAdmin(admin.ModelAdmin):
    list_display = ("event_name", "page_col", "step_key", "questionnaire_slug", "funnel_session", "user", "created_at")
    list_filter = ("event_name", "questionnaire_slug", "created_at")
    search_fields = ("event_name", "step_key", "questionnaire_slug", "funnel_session__id", "user__email")
    readonly_fields = auto_readonly_fields(FunnelEvent) + ("event_name", "funnel_session", "user", "questionnaire_slug", "step_key", "properties")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def page_col(self, obj):
        return (obj.properties or {}).get("page", "")
    page_col.short_description = "page"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(LandingPage)
class LandingPageAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "utm_source", "utm_campaign", "active", "ad_url_col", "created_at")
    list_filter = ("active", "utm_source")
    search_fields = ("name", "slug", "utm_source", "utm_campaign")
    readonly_fields = auto_readonly_fields(LandingPage) + ("ad_url_col",)
    fields = all_model_fields(LandingPage) + ("ad_url_col",)
    ordering = ("-created_at",)

    def ad_url_col(self, obj):
        url = f"https://beemahealth/lp/{obj.slug}"
        return format_html('<a href="{}" target="_blank">{}</a>', url, url)
    ad_url_col.short_description = "Ad URL"

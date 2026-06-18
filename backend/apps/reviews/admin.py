from django.contrib import admin

from apps.reviews.models import ProviderReview
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(ProviderReview)
class ProviderReviewAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(ProviderReview)
    fields = all_model_fields(ProviderReview)
    readonly_fields = auto_readonly_fields(ProviderReview)
    search_fields = ("id", "user__email", "reviewer__email", "internal_note", "patient_note")

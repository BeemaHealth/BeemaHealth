from django.contrib import admin

from apps.patients.models import PatientProfile
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(PatientProfile)
    fields = all_model_fields(PatientProfile)
    readonly_fields = auto_readonly_fields(PatientProfile)
    search_fields = ("user__email", "city", "zip_code", "address", "preferred_name")

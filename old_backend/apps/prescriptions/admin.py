from django.contrib import admin

from apps.prescriptions.models import PatientPrescription
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(PatientPrescription)
class PatientPrescriptionAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(PatientPrescription)
    fields = all_model_fields(PatientPrescription)
    readonly_fields = auto_readonly_fields(PatientPrescription)
    search_fields = (
        "id",
        "user__email",
        "medication_name",
        "pharmacy_name",
        "prescribed_by__email",
    )

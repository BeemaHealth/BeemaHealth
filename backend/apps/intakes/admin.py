from django.contrib import admin

from apps.intakes.models import MedicalIntake, SafetyFlag
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(MedicalIntake)
class MedicalIntakeAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(MedicalIntake)
    fields = all_model_fields(MedicalIntake)
    readonly_fields = auto_readonly_fields(MedicalIntake)
    search_fields = ("id", "user__email")


@admin.register(SafetyFlag)
class SafetyFlagAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(SafetyFlag)
    fields = all_model_fields(SafetyFlag)
    readonly_fields = auto_readonly_fields(SafetyFlag)
    search_fields = ("id", "user__email", "flag_type", "description")

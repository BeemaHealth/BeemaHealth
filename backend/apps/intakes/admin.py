from django.contrib import admin

from apps.intakes.models import (
    MedicalIntake,
    RefillRequest,
    SafetyFlag,
    SideEffectCheckIn,
    WeightCheckinPhoto,
)
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


@admin.register(RefillRequest)
class RefillRequestAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(RefillRequest)
    fields = all_model_fields(RefillRequest)
    readonly_fields = auto_readonly_fields(RefillRequest)
    search_fields = ("id", "user__email")


@admin.register(SideEffectCheckIn)
class SideEffectCheckInAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(SideEffectCheckIn)
    fields = all_model_fields(SideEffectCheckIn)
    readonly_fields = auto_readonly_fields(SideEffectCheckIn)
    search_fields = ("id", "user__email")


@admin.register(WeightCheckinPhoto)
class WeightCheckinPhotoAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(WeightCheckinPhoto)
    fields = all_model_fields(WeightCheckinPhoto)
    readonly_fields = auto_readonly_fields(WeightCheckinPhoto)
    search_fields = ("id", "check_in__user__email")

from django.contrib import admin

from apps.questionnaires.models import (
    Medication,
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "drug_type", "delivery_type", "price_cents", "active")
    list_filter = ("drug_type", "delivery_type", "active")
    search_fields = ("name", "slug")


class QuestionnaireFieldInline(admin.TabularInline):
    model = QuestionnaireField
    extra = 0
    fields = (
        "field_key",
        "field_type",
        "label",
        "required",
        "sort_order",
        "maps_to_section",
        "plugin_id",
    )
    ordering = ("sort_order",)


@admin.register(QuestionnaireStep)
class QuestionnaireStepAdmin(admin.ModelAdmin):
    list_display = ("step_key", "title", "sort_order", "version", "position_x", "position_y")
    list_filter = ("version__questionnaire__slug", "version__status")
    search_fields = ("step_key", "title")
    readonly_fields = ("id",)
    fields = (
        "id",
        "version",
        "step_key",
        "sort_order",
        "title",
        "subtitle",
        "visibility_rule",
        "routing_rules",
        "position_x",
        "position_y",
    )
    inlines = [QuestionnaireFieldInline]


class QuestionnaireStepInline(admin.TabularInline):
    model = QuestionnaireStep
    extra = 0
    fields = ("step_key", "title", "sort_order", "position_x", "position_y")
    ordering = ("sort_order",)
    show_change_link = True


@admin.register(QuestionnaireVersion)
class QuestionnaireVersionAdmin(admin.ModelAdmin):
    list_display = ("version_label", "questionnaire", "status", "published_at", "created_at")
    list_filter = ("status", "questionnaire__slug")
    search_fields = ("version_label", "questionnaire__slug")
    readonly_fields = ("id", "published_at", "created_at", "updated_at")
    inlines = [QuestionnaireStepInline]


@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "questionnaire_type", "medication")
    list_filter = ("questionnaire_type",)
    search_fields = ("slug", "title")

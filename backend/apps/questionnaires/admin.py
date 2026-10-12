import json
from typing import Any

from django.contrib import admin, messages
from django.http import HttpRequest
from django.utils.html import format_html

from apps.audit.mixins import AuditedAdminMixin

from .definition import DefinitionError
from .models import ImmutableVersionError, Layout, Questionnaire, QuestionnaireVersion, Submission, SubmissionFile
from .services import duplicate_version

RO = ("id", "created_at", "updated_at")


def _pretty(data: Any) -> str:
    return format_html("<pre style='white-space:pre-wrap;max-width:100%'>{}</pre>", json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False))


class VersionInline(admin.TabularInline):
    model = QuestionnaireVersion
    extra = 0
    can_delete = False
    fields = ("version_label", "status", "layout", "published_at")
    readonly_fields = fields
    show_change_link = True

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "product_slug", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("slug", "title", "product_slug")
    readonly_fields = RO
    inlines = [VersionInline]


@admin.register(Layout)
class LayoutAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "updated_at")
    search_fields = ("slug", "name")
    readonly_fields = (*RO, "config_pretty")

    @admin.display(description="Config (formatted)")
    def config_pretty(self, obj: Layout) -> str:
        return _pretty(obj.config)


@admin.register(QuestionnaireVersion)
class QuestionnaireVersionAdmin(admin.ModelAdmin):
    list_display = ("questionnaire", "version_label", "status", "layout", "published_at", "updated_at")
    list_filter = ("status", "questionnaire")
    search_fields = ("questionnaire__slug", "version_label", "definition_hash")
    actions = ["duplicate_as_draft", "publish_drafts"]

    def get_readonly_fields(self, request: HttpRequest, obj: QuestionnaireVersion | None = None) -> tuple[str, ...]:
        base = (*RO, "definition_hash", "published_at", "status", "definition_pretty")
        if obj is not None and obj.status != QuestionnaireVersion.Status.DRAFT:
            return (*base, "questionnaire", "version_label", "layout", "definition")
        return base

    def get_fields(self, request: HttpRequest, obj: QuestionnaireVersion | None = None) -> list[str]:
        fields = ["questionnaire", "version_label", "layout", "status", "definition_hash", "published_at"]
        if obj is None or obj.status == QuestionnaireVersion.Status.DRAFT:
            fields.append("definition")
        fields.append("definition_pretty")
        return fields

    def has_delete_permission(self, request: HttpRequest, obj: QuestionnaireVersion | None = None) -> bool:
        if obj is not None and obj.status != QuestionnaireVersion.Status.DRAFT:
            return False
        return super().has_delete_permission(request, obj)

    @admin.display(description="Definition (formatted)")
    def definition_pretty(self, obj: QuestionnaireVersion | None) -> str:
        return _pretty(obj.definition) if obj and obj.definition else "-"

    @admin.action(description="Duplicate selected versions as new drafts")
    def duplicate_as_draft(self, request: HttpRequest, queryset: Any) -> None:
        for version in queryset:
            copy = duplicate_version(version)
            self.message_user(request, f"Created draft {copy.version_label} for {version.questionnaire.slug}.", messages.SUCCESS)

    @admin.action(description="Publish selected drafts (archives the previous published version)")
    def publish_drafts(self, request: HttpRequest, queryset: Any) -> None:
        for version in queryset:
            try:
                version.publish()
            except (DefinitionError, ImmutableVersionError) as exc:
                self.message_user(request, f"{version}: {exc}", messages.ERROR)
            else:
                self.message_user(request, f"Published {version}.", messages.SUCCESS)


class SubmissionFileInline(admin.TabularInline):
    model = SubmissionFile
    extra = 0
    readonly_fields = RO


@admin.register(Submission)
class SubmissionAdmin(AuditedAdminMixin, admin.ModelAdmin):
    list_display = ("id", "version", "status", "current_node", "patient", "selected_plan", "last_activity_at")
    list_filter = ("status", "version__questionnaire", "version")
    search_fields = ("id", "patient__user__email", "current_node")
    readonly_fields = (*RO, "anonymous_token", "answers_pretty", "outcome_pretty")
    raw_id_fields = ("patient", "selected_plan")
    inlines = [SubmissionFileInline]

    @admin.display(description="Answers (formatted)")
    def answers_pretty(self, obj: Submission | None) -> str:
        return _pretty(obj.answers) if obj else "-"

    @admin.display(description="Outcome (formatted)")
    def outcome_pretty(self, obj: Submission | None) -> str:
        return _pretty(obj.outcome) if obj else "-"


@admin.register(SubmissionFile)
class SubmissionFileAdmin(AuditedAdminMixin, admin.ModelAdmin):
    list_display = ("id", "submission", "kind", "status", "size_bytes", "created_at")
    list_filter = ("kind", "status")
    search_fields = ("id", "s3_key", "submission__id")
    readonly_fields = RO
    raw_id_fields = ("submission",)

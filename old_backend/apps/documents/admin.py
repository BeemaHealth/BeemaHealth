from django.contrib import admin

from apps.documents.models import UploadedDocument
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(UploadedDocument)
class UploadedDocumentAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(UploadedDocument)
    fields = all_model_fields(UploadedDocument)
    readonly_fields = auto_readonly_fields(UploadedDocument)
    search_fields = ("id", "user__email", "original_filename", "file_key", "content_type")

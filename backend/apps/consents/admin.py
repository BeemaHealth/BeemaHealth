from django.contrib import admin

from apps.consents.models import ConsentRecord
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(ConsentRecord)
    fields = all_model_fields(ConsentRecord)
    readonly_fields = auto_readonly_fields(ConsentRecord)
    search_fields = ("id", "user__email", "typed_signature")

from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.db.models import F, Window
from django.db.models.functions import RowNumber
from rest_framework.authtoken.admin import TokenAdmin as BaseTokenAdmin
from rest_framework.authtoken.models import Token, TokenProxy

from apps.accounts.models import User
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields

for _model in (Group, Token, TokenProxy):
    if admin.site.is_registered(_model):
        admin.site.unregister(_model)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = None
    ordering = ("created_at", "id")

    @admin.display(description="ID", ordering="_user_number")
    def user_number(self, obj):
        return getattr(obj, "_user_number", "—")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _user_number=Window(
                expression=RowNumber(),
                order_by=[F("created_at").asc(), F("id").asc()],
            )
        )

    list_display = ("user_number",) + all_list_display_fields(User, exclude=("id", "password"))
    fields = ("user_number",) + all_model_fields(User, exclude=("id", "password"))
    readonly_fields = ("user_number",) + auto_readonly_fields(User) + ("last_login",)
    search_fields = ("email", "first_name", "last_name", "phone", "state")
    filter_horizontal = ("groups", "user_permissions")
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "first_name", "last_name"),
            },
        ),
    )


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin):
    list_display = all_list_display_fields(Group)
    fields = all_model_fields(Group)
    filter_horizontal = ("permissions",)


@admin.register(Token)
class TokenAdmin(BaseTokenAdmin):
    list_display = all_list_display_fields(Token)
    fields = all_model_fields(Token)
    readonly_fields = auto_readonly_fields(Token)

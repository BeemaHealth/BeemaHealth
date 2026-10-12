from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm

from .models import Grant, MagicLinkToken, Organization, StaffProfile, User


class UserCreationForm(BaseUserCreationForm):
    class Meta:
        model = User
        fields = ("email", "kind")


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"
        field_classes: dict = {}
        widgets = {"mfa_secret": forms.PasswordInput(render_value=True)}


class GrantInline(admin.TabularInline):
    model = Grant
    extra = 0
    fields = ("organization", "role", "is_active")


class StaffProfileInline(admin.StackedInline):
    model = StaffProfile
    extra = 0
    fields = ("display_name", "display_title", "message_role", "npi")


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserEditForm
    add_form = UserCreationForm
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "kind", "is_active", "is_staff", "is_superuser", "locked_until", "created_at")
    list_filter = ("kind", "is_active", "is_staff", "is_superuser", "mfa_enabled", "grants__role", "grants__organization")
    search_fields = ("email", "first_name", "last_name", "phone")
    readonly_fields = ("id", "created_at", "updated_at", "last_login", "last_login_ip", "password_changed_at")
    inlines = [GrantInline, StaffProfileInline]
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Personal", {"fields": ("first_name", "last_name", "phone", "timezone", "language", "avatar_s3_key")}),
        ("Account", {"fields": ("kind", "is_active", "is_staff", "is_superuser", "groups", "user_permissions", "deactivated_at")}),
        ("Verification and terms", {"fields": ("email_verified_at", "phone_verified_at", "terms_accepted_at", "terms_version")}),
        ("Security", {"fields": ("mfa_enabled", "mfa_secret", "failed_login_count", "locked_until", "last_login", "last_login_ip", "password_changed_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "kind", "password1", "password2")}),
    )
    actions = ["unlock_accounts"]

    @admin.action(description="Unlock selected accounts")
    def unlock_accounts(self, request, queryset):
        queryset.update(failed_login_count=0, locked_until=None)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "slug", "integration_adapter", "is_active")
    list_filter = ("kind", "is_active")
    search_fields = ("name", "slug", "integration_adapter")
    readonly_fields = ("id", "created_at", "updated_at")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [GrantInline]


@admin.register(Grant)
class GrantAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "role", "is_active")
    list_filter = ("role", "is_active", "organization")
    search_fields = ("user__email", "organization__name")
    readonly_fields = ("id", "created_at", "updated_at")
    autocomplete_fields = ("user",)


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name", "display_title", "message_role")
    list_filter = ("message_role",)
    search_fields = ("user__email", "display_name", "display_title", "npi")
    readonly_fields = ("id", "created_at", "updated_at")
    autocomplete_fields = ("user",)


@admin.register(MagicLinkToken)
class MagicLinkTokenAdmin(admin.ModelAdmin):
    """Credentials are stored hashed; shown read-only for support triage."""

    list_display = ("id", "user", "purpose", "expires_at", "used_at", "attempts", "created_at")
    list_filter = ("purpose",)
    search_fields = ("user__email",)
    readonly_fields = ("id", "user", "token_hash", "code_hash", "purpose", "expires_at", "used_at", "attempts", "requested_ip", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

from django.contrib import admin

from apps.payments.models import (
    AuthorizationHold,
    StripeCustomer,
    StripePaymentMethod,
    StripeWebhookEvent,
)
from config.admin_utils import all_list_display_fields, all_model_fields, auto_readonly_fields


@admin.register(AuthorizationHold)
class AuthorizationHoldAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(AuthorizationHold)
    fields = all_model_fields(AuthorizationHold)
    readonly_fields = auto_readonly_fields(AuthorizationHold)
    search_fields = ("id", "user__email", "idempotency_key")


@admin.register(StripeCustomer)
class StripeCustomerAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(StripeCustomer)
    fields = all_model_fields(StripeCustomer)
    readonly_fields = auto_readonly_fields(StripeCustomer)
    search_fields = ("id", "user__email")


@admin.register(StripePaymentMethod)
class StripePaymentMethodAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(StripePaymentMethod)
    fields = all_model_fields(StripePaymentMethod)
    readonly_fields = auto_readonly_fields(StripePaymentMethod)
    search_fields = ("id", "user__email")


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = all_list_display_fields(StripeWebhookEvent)
    fields = all_model_fields(StripeWebhookEvent)
    readonly_fields = auto_readonly_fields(StripeWebhookEvent)
    search_fields = ("id", "stripe_event_id")

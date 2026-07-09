from django.urls import path

from apps.payments.views import (
    PaymentHoldChangeCardView,
    PaymentHoldCreateView,
    PaymentHoldMeView,
    PaymentMethodListView,
    StripeWebhookView,
)

urlpatterns = [
    path("payment-hold/", PaymentHoldCreateView.as_view(), name="payment-hold-create"),
    path("payment-hold/me/", PaymentHoldMeView.as_view(), name="payment-hold-me"),
    path(
        "payment-hold/change-card/",
        PaymentHoldChangeCardView.as_view(),
        name="payment-hold-change-card",
    ),
    path("payment-methods/", PaymentMethodListView.as_view(), name="payment-methods"),
    path("stripe-webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
]

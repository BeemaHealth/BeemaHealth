from django.urls import path

from . import views

app_name = "billing"

urlpatterns = [
    path("quote/", views.QuoteView.as_view(), name="quote"),
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("subscriptions/", views.SubscriptionListView.as_view(), name="subscriptions"),
    path("subscriptions/<uuid:pk>/", views.SubscriptionDetailView.as_view(), name="subscription-detail"),
    path("subscriptions/<uuid:pk>/auto-renew/", views.AutoRenewView.as_view(), name="auto-renew"),
    path("subscriptions/<uuid:pk>/cancel/", views.CancelSubscriptionView.as_view(), name="subscription-cancel"),
    path("invoices/", views.InvoiceListView.as_view(), name="invoices"),
    path("invoices/<uuid:pk>/", views.InvoiceDetailView.as_view(), name="invoice-detail"),
    path("payment-methods/", views.PaymentMethodListView.as_view(), name="payment-methods"),
    path("payment-methods/setup-intent/", views.SetupIntentView.as_view(), name="setup-intent"),
    path("payment-methods/default/", views.DefaultPaymentMethodView.as_view(), name="default-payment-method"),
    path("credit/", views.StoreCreditView.as_view(), name="credit"),
]

from django.urls import path

from . import views

app_name = "integrations"

urlpatterns = [
    path("beluga/", views.beluga_webhook, name="beluga-webhook"),
    path("stripe/", views.stripe_webhook, name="stripe-webhook"),
    path("lifefile/", views.lifefile_webhook, name="lifefile-webhook"),
]

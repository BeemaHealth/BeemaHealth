from django.urls import path

from apps.integrations.views import BelugaWebhookView, DoctorWebhookView
from apps.pharmacy.views import LifeFileWebhookView

urlpatterns = [
    path("beluga/", BelugaWebhookView.as_view(), name="webhook-beluga"),
    path("doctor/", DoctorWebhookView.as_view(), name="webhook-doctor"),
    path("lifefile/", LifeFileWebhookView.as_view(), name="webhook-lifefile"),
]

from django.urls import path

from apps.integrations.views import DoctorWebhookView
from apps.pharmacy.views import LifeFileWebhookView

urlpatterns = [
    path("doctor/", DoctorWebhookView.as_view(), name="webhook-doctor"),
    path("lifefile/", LifeFileWebhookView.as_view(), name="webhook-lifefile"),
]

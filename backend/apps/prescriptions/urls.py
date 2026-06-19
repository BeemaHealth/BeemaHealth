from django.urls import path

from apps.prescriptions.views import PatientPrescriptionMeView

urlpatterns = [
    path("me/", PatientPrescriptionMeView.as_view(), name="prescription-me"),
]

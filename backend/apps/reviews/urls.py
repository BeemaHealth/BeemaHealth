from django.urls import path

from apps.prescriptions.views import PatientPrescriptionAdminView
from apps.reviews.views import PatientDetailView, PatientListView, ProviderReviewSyncView

urlpatterns = [
    path("patients/", PatientListView.as_view(), name="admin-patient-list"),
    path("patients/<uuid:patient_id>/", PatientDetailView.as_view(), name="admin-patient-detail"),
    path(
        "patients/<uuid:patient_id>/prescription/",
        PatientPrescriptionAdminView.as_view(),
        name="admin-patient-prescription",
    ),
]

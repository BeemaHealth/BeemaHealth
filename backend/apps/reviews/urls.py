from django.urls import path

from apps.reviews.views import PatientDetailView, PatientListView, ProviderReviewSyncView

urlpatterns = [
    path("patients/", PatientListView.as_view(), name="admin-patient-list"),
    path("patients/<uuid:patient_id>/", PatientDetailView.as_view(), name="admin-patient-detail"),
]

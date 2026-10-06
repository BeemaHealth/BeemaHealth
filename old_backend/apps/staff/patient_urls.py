from django.urls import path

from apps.staff.patient_views import StaffPatientListView

urlpatterns = [
    path("", StaffPatientListView.as_view(), name="staff-patient-list"),
]

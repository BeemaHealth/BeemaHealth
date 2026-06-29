from django.urls import include, path

from apps.questionnaires.staff_urls import medication_urlpatterns, vendor_urlpatterns
from apps.staff.views import StaffDevBelugaMockView, StaffDevSettingsView, StaffSummaryView

urlpatterns = [
    path("summary/", StaffSummaryView.as_view(), name="staff-summary"),
    path("dev/", StaffDevSettingsView.as_view(), name="staff-dev-settings"),
    path("dev/beluga-webhook/", StaffDevBelugaMockView.as_view(), name="staff-dev-beluga-mock"),
    path("analytics/", include("apps.analytics.staff_urls")),
    path("questionnaires/", include("apps.questionnaires.staff_urls")),
    path("medications/", include(medication_urlpatterns)),
    path("vendors/", include(vendor_urlpatterns)),
    path("experiments/", include("apps.questionnaires.experiment_urls")),
    path("patients/", include("apps.staff.patient_urls")),
]

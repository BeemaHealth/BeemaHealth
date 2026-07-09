from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import HealthCheckView
from apps.eligibility.urls import funnel_urlpatterns
from apps.intakes.urls import (
    refill_config_urlpatterns,
    refill_urlpatterns,
    same_dose_refill_urlpatterns,
    side_effect_urlpatterns,
    titration_refill_urlpatterns,
)
from apps.prescriptions.urls import urlpatterns as prescription_urlpatterns
from apps.patients.urls import profile_urlpatterns, settings_urlpatterns
from apps.reviews.views import ProviderReviewSyncView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/funnel/", include(funnel_urlpatterns)),
    path("api/eligibility/", include("apps.eligibility.urls")),
    path("api/medical-intakes/", include("apps.intakes.urls")),
    path("api/side-effect-check-ins/", include(side_effect_urlpatterns)),
    path("api/consent-records/", include("apps.consents.urls")),
    path("api/dashboard/", include("apps.patients.urls")),
    path("api/patient-profile/", include(profile_urlpatterns)),
    path("api/patient-settings/", include(settings_urlpatterns)),
    path("api/documents/", include("apps.documents.urls")),
    path("api/refill-requests/", include(refill_urlpatterns)),
    path("api/refills/same-dose/", include(same_dose_refill_urlpatterns)),
    path("api/refills/titration/", include(titration_refill_urlpatterns)),
    # Specific sub-path must come before the generic api/prescriptions/ include
    path("api/prescriptions/me/refill-config/", include(refill_config_urlpatterns)),
    path("api/prescriptions/", include(prescription_urlpatterns)),
    path("api/admin/", include("apps.reviews.urls")),
    path("api/pharmacy/", include("apps.pharmacy.urls")),
    path("api/webhooks/", include("apps.integrations.urls")),
    path("api/provider-reviews/", ProviderReviewSyncView.as_view(), name="provider-reviews"),
    path("api/analytics/", include("apps.analytics.urls")),
    path("api/questionnaires/", include("apps.questionnaires.urls")),
    path("api/staff/", include("apps.staff.urls")),
    path("api/payments/", include("apps.payments.urls")),
]

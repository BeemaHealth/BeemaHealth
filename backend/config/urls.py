from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import HealthCheckView
from apps.eligibility.urls import funnel_urlpatterns
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
    path("api/consent-records/", include("apps.consents.urls")),
    path("api/dashboard/", include("apps.patients.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/admin/", include("apps.reviews.urls")),
    path("api/provider-reviews/", ProviderReviewSyncView.as_view(), name="provider-reviews"),
]

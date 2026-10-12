from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/patients/", include("apps.patients.urls")),
    path("api/v1/catalog/", include("apps.catalog.urls")),
    path("api/v1/questionnaires/", include("apps.questionnaires.urls")),
    path("api/v1/treatments/", include("apps.clinical.urls")),
    path("api/v1/fulfillment/", include("apps.fulfillment.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/messaging/", include("apps.messaging.urls")),
    path("api/v1/webhooks/", include("apps.integrations.urls")),
]

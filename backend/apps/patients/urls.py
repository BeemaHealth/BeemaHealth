from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "patients"

router = DefaultRouter()
router.register("addresses", views.AddressViewSet, basename="address")
router.register("allergies", views.AllergyViewSet, basename="allergy")
router.register("medications", views.MedicationViewSet, basename="medication")
router.register("conditions", views.ConditionViewSet, basename="condition")
router.register("consents", views.ConsentViewSet, basename="consent")
router.register("data-requests", views.DataRequestViewSet, basename="data-request")

urlpatterns = [
    path("me/profile/", views.ProfileView.as_view(), name="profile"),
    path("export/", views.ExportView.as_view(), name="export"),
    path("identity-documents/presign/", views.IdentityDocumentPresignView.as_view(), name="identity-presign"),
    path("", include(router.urls)),
]

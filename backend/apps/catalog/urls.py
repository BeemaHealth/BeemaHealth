from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.catalog.views import ProductViewSet

app_name = "catalog"

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")

urlpatterns = [
    path("", include(router.urls)),
]

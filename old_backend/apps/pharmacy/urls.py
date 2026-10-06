from django.urls import path

from apps.pharmacy.views import (
    PharmacyOrderCreateView,
    PharmacyOrderDetailView,
    PharmacyOrderMeView,
)

urlpatterns = [
    path("orders/", PharmacyOrderCreateView.as_view(), name="pharmacy-order-create"),
    path("orders/me/", PharmacyOrderMeView.as_view(), name="pharmacy-order-me"),
    path("orders/<uuid:order_id>/", PharmacyOrderDetailView.as_view(), name="pharmacy-order-detail"),
]

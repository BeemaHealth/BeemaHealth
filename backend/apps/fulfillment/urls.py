from django.urls import path

from . import views

app_name = "fulfillment"

urlpatterns = [
    path("orders/", views.OrderListView.as_view(), name="orders"),
    path("orders/<uuid:pk>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("shipments/", views.ShipmentListView.as_view(), name="shipments"),
    path("next-shipment/", views.NextShipmentView.as_view(), name="next-shipment"),
    path("request-refill/", views.RequestRefillView.as_view(), name="request-refill"),
]

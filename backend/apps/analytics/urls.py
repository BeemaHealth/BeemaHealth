from django.urls import path

from apps.analytics.views import FunnelEventCreateView

urlpatterns = [
    path("events/", FunnelEventCreateView.as_view(), name="analytics-events"),
]

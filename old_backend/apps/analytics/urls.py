from django.urls import path

from apps.analytics.views import FunnelEventCreateView, LandingPageResolveView

urlpatterns = [
    path("events/", FunnelEventCreateView.as_view(), name="analytics-events"),
    path("lp/<slug:slug>/", LandingPageResolveView.as_view(), name="landing-page-resolve"),
]

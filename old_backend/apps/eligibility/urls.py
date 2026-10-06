from django.urls import path

from apps.eligibility.views import (
    EligibilityMeView,
    FunnelEligibilityView,
    FunnelSessionPatchView,
    FunnelSessionView,
)

urlpatterns = [
    path("me/", EligibilityMeView.as_view(), name="eligibility-me"),
    path("", EligibilityMeView.as_view(), name="eligibility-create"),
]

funnel_urlpatterns = [
    path("session/", FunnelSessionView.as_view(), name="funnel-session"),
    path("session/attribution/", FunnelSessionPatchView.as_view(), name="funnel-session-attribution"),
    path("eligibility/", FunnelEligibilityView.as_view(), name="funnel-eligibility"),
]

from django.urls import path

from apps.intakes.views import (
    IntakeRefreshAccountScreeningView,
    IntakeResubmitMeView,
    IntakeSubmissionsMeView,
    MedicalIntakeMeView,
    RefillRequestMeView,
    SideEffectCheckInMeView,
)

urlpatterns = [
    path("me/", MedicalIntakeMeView.as_view(), name="intake-me"),
    path(
        "me/refresh-account-screening/",
        IntakeRefreshAccountScreeningView.as_view(),
        name="intake-refresh-account-screening",
    ),
    path("me/submissions/", IntakeSubmissionsMeView.as_view(), name="intake-submissions-me"),
    path("me/resubmit/", IntakeResubmitMeView.as_view(), name="intake-resubmit-me"),
    path("", MedicalIntakeMeView.as_view(), name="intake-create"),
]

side_effect_urlpatterns = [
    path("me/", SideEffectCheckInMeView.as_view(), name="side-effect-check-in-me"),
]

refill_urlpatterns = [
    path("me/", RefillRequestMeView.as_view(), name="refill-request-me"),
]

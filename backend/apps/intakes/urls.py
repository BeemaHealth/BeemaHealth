from django.urls import path

from apps.intakes.views import (
    MedicalIntakeMeView,
    RefillRequestMeView,
    SideEffectCheckInMeView,
)

urlpatterns = [
    path("me/", MedicalIntakeMeView.as_view(), name="intake-me"),
    path("", MedicalIntakeMeView.as_view(), name="intake-create"),
]

side_effect_urlpatterns = [
    path("me/", SideEffectCheckInMeView.as_view(), name="side-effect-check-in-me"),
]

refill_urlpatterns = [
    path("me/", RefillRequestMeView.as_view(), name="refill-request-me"),
]

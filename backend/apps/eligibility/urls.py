from django.urls import path

from apps.eligibility.views import EligibilityMeView

urlpatterns = [
    path("me/", EligibilityMeView.as_view(), name="eligibility-me"),
    path("", EligibilityMeView.as_view(), name="eligibility-create"),
]

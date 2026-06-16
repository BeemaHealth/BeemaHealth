from django.urls import path

from apps.consents.views import ConsentMeView

urlpatterns = [
    path("me/", ConsentMeView.as_view(), name="consent-me"),
    path("", ConsentMeView.as_view(), name="consent-create"),
]

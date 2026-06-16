from django.urls import path

from apps.intakes.views import MedicalIntakeMeView

urlpatterns = [
    path("me/", MedicalIntakeMeView.as_view(), name="intake-me"),
    path("", MedicalIntakeMeView.as_view(), name="intake-create"),
]

from django.urls import path

from apps.patients.views import DashboardView

urlpatterns = [
    path("me/", DashboardView.as_view(), name="dashboard-me"),
]

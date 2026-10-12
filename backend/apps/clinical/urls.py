from django.urls import path

from . import views

app_name = "clinical"

urlpatterns = [
    path("", views.TreatmentListView.as_view(), name="treatment-list"),
    path("home/", views.HomeView.as_view(), name="home"),
    path("dose-logs/", views.DoseLogListCreateView.as_view(), name="dose-log-list"),
    path("dose-logs/<uuid:pk>/", views.DoseLogDetailView.as_view(), name="dose-log-detail"),
    path("health-metrics/", views.HealthMetricListCreateView.as_view(), name="health-metric-list"),
    path("health-metrics/<uuid:pk>/", views.HealthMetricDetailView.as_view(), name="health-metric-detail"),
    path("action-items/", views.ActionItemListView.as_view(), name="action-item-list"),
    path("<uuid:pk>/", views.TreatmentDetailView.as_view(), name="treatment-detail"),
    path("<uuid:pk>/cancel/", views.TreatmentCancelView.as_view(), name="treatment-cancel"),
]

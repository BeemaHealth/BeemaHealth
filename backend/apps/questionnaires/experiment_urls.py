from django.urls import path

from apps.questionnaires.experiment_views import (
    StaffExperimentDetailView,
    StaffExperimentListView,
    StaffExperimentResultsView,
    StaffExperimentVariantListView,
)

urlpatterns = [
    path("", StaffExperimentListView.as_view(), name="staff-experiment-list"),
    path("<uuid:experiment_id>/", StaffExperimentDetailView.as_view(), name="staff-experiment-detail"),
    path(
        "<uuid:experiment_id>/variants/",
        StaffExperimentVariantListView.as_view(),
        name="staff-experiment-variant-create",
    ),
    path(
        "<uuid:experiment_id>/results/",
        StaffExperimentResultsView.as_view(),
        name="staff-experiment-results",
    ),
]

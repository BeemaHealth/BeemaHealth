from django.urls import path

from apps.questionnaires.staff_views import (
    StaffMedicationDetailView,
    StaffMedicationListView,
    StaffQualifyCtaOwnershipView,
    StaffQuestionnaireArchiveView,
    StaffQuestionnaireDetailView,
    StaffQuestionnaireDuplicateQuestionnaireView,
    StaffQuestionnaireDuplicateView,
    StaffQuestionnaireFieldDetailView,
    StaffQuestionnaireFieldListView,
    StaffQuestionnaireListView,
    StaffQuestionnairePublishView,
    StaffQuestionnaireStepDetailView,
    StaffQuestionnaireStepListView,
    StaffQuestionnaireVersionDetailView,
    StaffQuestionnaireVersionListView,
)

medication_urlpatterns = [
    path("", StaffMedicationListView.as_view(), name="staff-medication-list"),
    path(
        "<uuid:medication_id>/",
        StaffMedicationDetailView.as_view(),
        name="staff-medication-detail",
    ),
]

urlpatterns = [
    path("", StaffQuestionnaireListView.as_view(), name="staff-questionnaire-list"),
    path(
        "qualify-cta-ownership/",
        StaffQualifyCtaOwnershipView.as_view(),
        name="staff-qualify-cta-ownership",
    ),
    path(
        "<slug:slug>/",
        StaffQuestionnaireDetailView.as_view(),
        name="staff-questionnaire-detail",
    ),
    path(
        "<slug:slug>/duplicate/",
        StaffQuestionnaireDuplicateQuestionnaireView.as_view(),
        name="staff-questionnaire-duplicate-questionnaire",
    ),
    path(
        "<slug:slug>/versions/",
        StaffQuestionnaireVersionListView.as_view(),
        name="staff-questionnaire-versions",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/",
        StaffQuestionnaireVersionDetailView.as_view(),
        name="staff-questionnaire-version-detail",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/publish/",
        StaffQuestionnairePublishView.as_view(),
        name="staff-questionnaire-publish",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/archive/",
        StaffQuestionnaireArchiveView.as_view(),
        name="staff-questionnaire-archive",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/duplicate/",
        StaffQuestionnaireDuplicateView.as_view(),
        name="staff-questionnaire-duplicate",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/steps/",
        StaffQuestionnaireStepListView.as_view(),
        name="staff-questionnaire-step-create",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/steps/<str:step_key>/",
        StaffQuestionnaireStepDetailView.as_view(),
        name="staff-questionnaire-step-detail",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/steps/<str:step_key>/fields/",
        StaffQuestionnaireFieldListView.as_view(),
        name="staff-questionnaire-field-create",
    ),
    path(
        "<slug:slug>/versions/<uuid:version_id>/steps/<str:step_key>/fields/<str:field_key>/",
        StaffQuestionnaireFieldDetailView.as_view(),
        name="staff-questionnaire-field-detail",
    ),
]

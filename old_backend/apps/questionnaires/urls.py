from django.urls import path

from apps.questionnaires.views import (
    ActiveQuestionnaireView,
    ResolveIntakeQuestionnaireView,
)

urlpatterns = [
    path(
        "<slug:slug>/active/",
        ActiveQuestionnaireView.as_view(),
        name="questionnaire-active",
    ),
    path(
        "resolve-intake/",
        ResolveIntakeQuestionnaireView.as_view(),
        name="questionnaire-resolve-intake",
    ),
]

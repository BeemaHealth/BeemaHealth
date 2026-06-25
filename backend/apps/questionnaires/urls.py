from django.urls import path

from apps.questionnaires.views import ActiveQuestionnaireView

urlpatterns = [
    path(
        "<slug:slug>/active/",
        ActiveQuestionnaireView.as_view(),
        name="questionnaire-active",
    ),
]

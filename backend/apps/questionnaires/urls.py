from django.urls import path

from . import views

app_name = "questionnaires"

urlpatterns = [
    path("start/", views.StartView.as_view(), name="start"),
    path("current/", views.CurrentView.as_view(), name="current"),
    path("answer/", views.AnswerView.as_view(), name="answer"),
    path("back/", views.BackView.as_view(), name="back"),
    path("claim/", views.ClaimView.as_view(), name="claim"),
    path("upload-url/", views.UploadUrlView.as_view(), name="upload-url"),
]

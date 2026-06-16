from django.urls import path

from apps.documents.views import DocumentListCreateView

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="documents"),
]

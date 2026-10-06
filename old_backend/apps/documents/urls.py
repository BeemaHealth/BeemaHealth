from django.urls import path

from apps.documents.views import (
    DocumentDetailView,
    DocumentFileUploadView,
    DocumentFileView,
    DocumentListCreateView,
)

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="documents"),
    path("<uuid:document_id>/", DocumentDetailView.as_view(), name="document-detail"),
    path("<uuid:document_id>/upload/", DocumentFileUploadView.as_view(), name="document-upload"),
    path("<uuid:document_id>/file/", DocumentFileView.as_view(), name="document-file"),
]

from django.urls import path

from apps.documents.views import DocumentFileUploadView, DocumentListCreateView

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="documents"),
    path("<uuid:document_id>/upload/", DocumentFileUploadView.as_view(), name="document-upload"),
]

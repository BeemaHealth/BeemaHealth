import uuid

from django.db import models

from apps.accounts.models import User


class UploadedDocument(models.Model):
    DOCUMENT_TYPES = [
        ("lab_results", "Lab results"),
        ("insurance_card", "Insurance card"),
        ("photo_id", "Photo ID"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=32, choices=DOCUMENT_TYPES)
    file_key = models.CharField(max_length=512)
    original_filename = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=128, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "uploaded_documents"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.document_type} for {self.user.email}"

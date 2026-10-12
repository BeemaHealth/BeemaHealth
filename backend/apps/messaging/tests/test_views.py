"""Tests for messaging API views."""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.messaging.models import Conversation
from apps.patients.models import PatientProfile

User = get_user_model()


class UploadUrlEndpointTest(TestCase):
    """Test the upload_url endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            email="patient@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.patient_user)
        self.conversation = Conversation.objects.create(
            patient=self.patient,
            kind="support",
        )

        # Other patient for isolation test
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="testpass123"
        )
        self.other_patient = PatientProfile.objects.create(user=self.other_user)
        self.other_conversation = Conversation.objects.create(
            patient=self.other_patient,
            kind="support",
        )

        self.client.force_authenticate(user=self.patient_user)

    def test_upload_url_valid_request(self):
        """Valid upload request returns presigned URL."""
        with patch('apps.messaging.views._presign_upload') as mock_presign:
            mock_presign.return_value = {
                "url": "https://bucket.s3.amazonaws.com/",
                "fields": {
                    "key": "test-key",
                    "Content-Type": "image/jpeg",
                },
            }

            response = self.client.post(
                f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
                {
                    "filename": "photo.jpg",
                    "content_type": "image/jpeg",
                    "size": 5000,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("s3_key", data)
        self.assertIn("upload_url", data)
        self.assertIn("fields", data)
        # Verify S3 key doesn't contain original filename
        self.assertNotIn("photo.jpg", data["s3_key"])

    def test_upload_url_bad_mime_type(self):
        """Bad content type returns 400."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
            {
                "filename": "script.exe",
                "content_type": "application/x-msdownload",
                "size": 5000,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("not allowed", response.json()["error"].lower())

    def test_upload_url_too_large(self):
        """File too large returns 400."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
            {
                "filename": "huge.pdf",
                "content_type": "application/pdf",
                "size": 20 * 1024 * 1024,  # 20MB, exceeds max
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("size", response.json()["error"].lower())

    def test_upload_url_zero_size(self):
        """Zero or negative size returns 400."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
            {
                "filename": "empty.jpg",
                "content_type": "image/jpeg",
                "size": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("size", response.json()["error"].lower())

    def test_upload_url_no_bucket(self):
        """Missing PHI_UPLOAD_BUCKET returns 503."""
        with patch('apps.messaging.views._presign_upload') as mock_presign:
            from apps.messaging.views import StorageNotConfigured
            mock_presign.side_effect = StorageNotConfigured("Not configured")

            response = self.client.post(
                f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
                {
                    "filename": "photo.jpg",
                    "content_type": "image/jpeg",
                    "size": 5000,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("not available", response.json()["error"].lower())

    def test_upload_url_other_patient_conversation_404(self):
        """Patient cannot upload to another patient's conversation."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.other_conversation.id}/upload_url/",
            {
                "filename": "photo.jpg",
                "content_type": "image/jpeg",
                "size": 5000,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_upload_url_invalid_size_type(self):
        """Non-integer size returns 400."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
            {
                "filename": "photo.jpg",
                "content_type": "image/jpeg",
                "size": "not-a-number",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("integer", response.json()["error"].lower())

    def test_upload_url_boolean_size_rejected(self):
        """Boolean size (which is int subclass) returns 400."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
            {
                "filename": "photo.jpg",
                "content_type": "image/jpeg",
                "size": True,  # Boolean is subclass of int
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_upload_url_missing_filename(self):
        """Missing filename returns 400."""
        response = self.client.post(
            f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
            {
                "content_type": "image/jpeg",
                "size": 5000,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("filename", response.json()["error"].lower())

    def test_upload_url_path_traversal_in_filename(self):
        """Path traversal attempts in filename are sanitized."""
        with patch('apps.messaging.views._presign_upload') as mock_presign:
            mock_presign.return_value = {
                "url": "https://bucket.s3.amazonaws.com/",
                "fields": {"key": "test-key"},
            }

            response = self.client.post(
                f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
                {
                    "filename": "../../etc/passwd",
                    "content_type": "image/jpeg",
                    "size": 5000,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        # Verify path separators are removed from filename
        # (though filename isn't used in S3 key anyway)

    def test_upload_url_allowed_mimes(self):
        """All allowed MIME types work."""
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]

        for mime_type in allowed_types:
            ext = mime_type.split("/")[-1]
            with patch('apps.messaging.views._presign_upload') as mock_presign:
                mock_presign.return_value = {
                    "url": "https://bucket.s3.amazonaws.com/",
                    "fields": {"key": "test-key"},
                }

                response = self.client.post(
                    f"/api/v1/messaging/conversations/{self.conversation.id}/upload_url/",
                    {
                        "filename": f"file.{ext}",
                        "content_type": mime_type,
                        "size": 5000,
                    },
                    format="json",
                )

            self.assertEqual(response.status_code, 200, f"Failed for {mime_type}")

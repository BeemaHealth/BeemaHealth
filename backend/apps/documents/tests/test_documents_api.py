import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import COMMAND_INJECTION, OVERFLOW, PATH_TRAVERSAL, XSS_PAYLOADS
from apps.documents.models import UploadedDocument


def valid_document_payload(**overrides):
    payload = {
        "document_type": "lab_results",
        "filename": "lab-results.pdf",
        "content_type": "application/pdf",
    }
    payload.update(overrides)
    return payload


class DocumentsApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            password="secure-pass-1",
            first_name="Other",
            last_name="User",
            phone="3035550101",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("documents")

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_list_documents_empty(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_create_document_returns_local_upload(self):
        response = self.client.post(self.list_url, valid_document_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["upload"]["method"], "local")
        self.assertIsNone(response.data["upload"]["upload_url"])
        self.assertTrue(
            UploadedDocument.objects.filter(
                user=self.user,
                document_type="lab_results",
                original_filename="lab-results.pdf",
            ).exists()
        )

    @override_settings(USE_S3_STORAGE=False)
    def test_local_upload_persists_file(self):
        with tempfile.TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                create = self.client.post(
                    self.list_url,
                    valid_document_payload(filename="my-labs.pdf"),
                    format="json",
                )
                self.assertEqual(create.status_code, status.HTTP_201_CREATED)
                doc_id = create.data["document"]["id"]
                file_key = create.data["document"]["file_key"]

                upload_url = reverse("document-upload", kwargs={"document_id": doc_id})
                file = SimpleUploadedFile(
                    "my-labs.pdf",
                    b"%PDF-1.4 test content",
                    content_type="application/pdf",
                )
                response = self.client.post(
                    upload_url,
                    {"file": file},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                saved = Path(media_root) / file_key
                self.assertTrue(saved.is_file())
                self.assertEqual(saved.read_bytes(), b"%PDF-1.4 test content")
                self.assertIsNotNone(response.data["file_url"])

    @override_settings(USE_S3_STORAGE=False)
    def test_download_own_document_file(self):
        with tempfile.TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                create = self.client.post(
                    self.list_url,
                    valid_document_payload(filename="view-me.pdf"),
                    format="json",
                )
                doc_id = create.data["document"]["id"]
                upload_url = reverse("document-upload", kwargs={"document_id": doc_id})
                file = SimpleUploadedFile(
                    "view-me.pdf",
                    b"%PDF-1.4 view content",
                    content_type="application/pdf",
                )
                self.client.post(upload_url, {"file": file}, format="multipart")

                file_url = reverse("document-file", kwargs={"document_id": doc_id})
                response = self.client.get(file_url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(
                    b"".join(response.streaming_content),
                    b"%PDF-1.4 view content",
                )
                self.assertEqual(response["Content-Type"], "application/pdf")

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_cannot_download_other_users_document_file(self):
        doc = UploadedDocument.objects.create(
            user=self.other,
            document_type="lab_results",
            file_key=f"local/{self.other.id}/lab_results/abc-test.pdf",
            original_filename="test.pdf",
            content_type="application/pdf",
        )
        file_url = reverse("document-file", kwargs={"document_id": doc.id})
        response = self.client.get(file_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_create_png_screenshot_filename(self):
        filename = "Screenshot 2026-06-11 at 9.42.31 AM.png"
        response = self.client.post(
            self.list_url,
            valid_document_payload(
                document_type="other",
                filename=filename,
                content_type="image/png",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["document"]["original_filename"], filename)
        self.assertEqual(response.data["document"]["content_type"], "image/png")

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_create_png_screenshot_filename_with_macos_narrow_space(self):
        raw_filename = "Screenshot 2026-06-11 at 9.42.31\u202fAM.png"
        expected = "Screenshot 2026-06-11 at 9.42.31 AM.png"
        response = self.client.post(
            self.list_url,
            valid_document_payload(
                document_type="other",
                filename=raw_filename,
                content_type="image/png",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["document"]["original_filename"], expected)

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_rejects_malicious_filename(self):
        attacks = XSS_PAYLOADS + PATH_TRAVERSAL + OVERFLOW + COMMAND_INJECTION
        for payload in attacks:
            with self.subTest(payload=payload[:80]):
                response = self.client.post(
                    self.list_url,
                    valid_document_payload(filename=payload),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_rejects_invalid_content_type(self):
        response = self.client.post(
            self.list_url,
            valid_document_payload(content_type="text/html"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_rejects_unauthenticated(self):
        client = APIClient()
        response = client.post(self.list_url, valid_document_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(USE_S3_STORAGE=False)
    def test_cannot_upload_other_users_document(self):
        with tempfile.TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                doc = UploadedDocument.objects.create(
                    user=self.other,
                    document_type="other",
                    file_key=f"local/{self.other.id}/other/abc-test.pdf",
                    original_filename="test.pdf",
                    content_type="application/pdf",
                )
                upload_url = reverse("document-upload", kwargs={"document_id": doc.id})
                file = SimpleUploadedFile(
                    "test.pdf",
                    b"data",
                    content_type="application/pdf",
                )
                response = self.client.post(
                    upload_url,
                    {"file": file},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(USE_S3_STORAGE=True, MEDIA_ROOT=tempfile.gettempdir())
    def test_local_upload_disabled_when_s3_enabled(self):
        doc = UploadedDocument.objects.create(
            user=self.user,
            document_type="other",
            file_key=f"local/{self.user.id}/other/abc-test.pdf",
            original_filename="test.pdf",
            content_type="application/pdf",
        )
        upload_url = reverse("document-upload", kwargs={"document_id": doc.id})
        file = SimpleUploadedFile("test.pdf", b"data", content_type="application/pdf")
        response = self.client.post(
            upload_url,
            {"file": file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    @override_settings(USE_S3_STORAGE=False)
    def test_delete_own_document_removes_db_and_local_file(self):
        with tempfile.TemporaryDirectory() as media_root:
            with self.settings(MEDIA_ROOT=media_root):
                create = self.client.post(
                    self.list_url,
                    valid_document_payload(filename="remove-me.pdf"),
                    format="json",
                )
                doc_id = create.data["document"]["id"]
                file_key = create.data["document"]["file_key"]
                upload_url = reverse("document-upload", kwargs={"document_id": doc_id})
                file = SimpleUploadedFile(
                    "remove-me.pdf",
                    b"%PDF-1.4",
                    content_type="application/pdf",
                )
                self.client.post(upload_url, {"file": file}, format="multipart")
                saved = Path(media_root) / file_key
                self.assertTrue(saved.is_file())

                detail_url = reverse("document-detail", kwargs={"document_id": doc_id})
                response = self.client.delete(detail_url)
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
                self.assertFalse(UploadedDocument.objects.filter(id=doc_id).exists())
                self.assertFalse(saved.is_file())

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_cannot_delete_other_users_document(self):
        doc = UploadedDocument.objects.create(
            user=self.other,
            document_type="lab_results",
            file_key=f"local/{self.other.id}/lab_results/abc-test.pdf",
            original_filename="test.pdf",
            content_type="application/pdf",
        )
        detail_url = reverse("document-detail", kwargs={"document_id": doc.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_patch_document_type(self):
        create = self.client.post(
            self.list_url,
            valid_document_payload(document_type="lab_results"),
            format="json",
        )
        doc_id = create.data["document"]["id"]
        detail_url = reverse("document-detail", kwargs={"document_id": doc_id})
        response = self.client.patch(
            detail_url,
            {"document_type": "photo_id"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["document_type"], "photo_id")

    @override_settings(USE_S3_STORAGE=False, MEDIA_ROOT=tempfile.gettempdir())
    def test_rejects_invalid_document_type_on_patch(self):
        create = self.client.post(self.list_url, valid_document_payload(), format="json")
        doc_id = create.data["document"]["id"]
        detail_url = reverse("document-detail", kwargs={"document_id": doc_id})
        response = self.client.patch(
            detail_url,
            {"document_type": "other"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

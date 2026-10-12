"""Object level access and input checks for the patient messaging API."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.tests.helpers import make_patient
from apps.messaging.models import Conversation, Message

DUMMY = "00000000-0000-0000-0000-000000000009"


class MessagingApiSecurityTests(TestCase):
    def setUp(self):
        self.user_a = make_patient()
        self.user_b = make_patient()
        self.conv_a = Conversation.objects.create(patient=self.user_a.patient_profile, kind="support")
        self.conv_b = Conversation.objects.create(patient=self.user_b.patient_profile, kind="support")
        self.client = APIClient()
        self.client.force_login(self.user_a)

    def url(self, conv, suffix=""):
        return f"/api/v1/messaging/conversations/{conv.id}/{suffix}"

    def test_patient_a_cannot_read_or_use_patient_b_conversation(self):
        self.assertEqual(self.client.get(self.url(self.conv_b)).status_code, 404)
        self.assertEqual(self.client.post(self.url(self.conv_b, "send_message/"), {"body": "hi"}, format="json").status_code, 404)
        self.assertEqual(self.client.post(self.url(self.conv_b, "upload_url/"), {}, format="json").status_code, 404)
        self.assertFalse(Message.objects.filter(conversation=self.conv_b).exists())

    def test_list_only_contains_own_conversations(self):
        ids = {c["id"] for c in self.client.get("/api/v1/messaging/conversations/").json()}
        self.assertEqual(ids, {str(self.conv_a.id)})

    def test_mark_read_only_touches_own_conversations(self):
        Conversation.objects.filter(pk=self.conv_b.pk).update(unread_for_patient=True)
        self.client.post("/api/v1/messaging/conversations/mark_read/", {}, format="json")
        self.conv_b.refresh_from_db()
        self.assertTrue(self.conv_b.unread_for_patient)

    def test_malformed_id_is_404_not_500(self):
        self.assertEqual(self.client.get("/api/v1/messaging/conversations/not-a-uuid/").status_code, 404)

    def test_upload_url_works_and_scopes_key_to_the_conversation(self):
        from unittest.mock import patch
        with patch('apps.messaging.views._presign_upload') as mock_presign:
            mock_presign.return_value = {
                "url": "https://bucket.s3.amazonaws.com/",
                "fields": {"key": "test-key"},
            }

            response = self.client.post(
                self.url(self.conv_a, "upload_url/"),
                {
                    "filename": "test.jpg",
                    "content_type": "image/jpeg",
                    "size": 1024,
                },
                format="json"
            )

        self.assertEqual(response.status_code, 200)
        s3_key = response.json()["s3_key"]
        # Verify key is scoped to this patient and conversation (but no original filename)
        self.assertTrue(s3_key.startswith(f"messages/{self.user_a.patient_profile.id}/{self.conv_a.id}/"))
        self.assertNotIn("test.jpg", s3_key)

    def test_attachment_cannot_reference_another_patients_file(self):
        for key in (
            f"identity/{self.user_b.patient_profile.pk}/doc",
            f"messages/{self.conv_b.id}/file",
            f"messages/{self.conv_a.id}/../{self.conv_b.id}/file",
        ):
            att = {"s3_key": key, "mime": "image/png", "size": 10}
            response = self.client.post(self.url(self.conv_a, "send_message/"), {"body": "hi", "attachments": [att]}, format="json")
            self.assertEqual(response.status_code, 400, key)
        self.assertFalse(Message.objects.filter(conversation=self.conv_a).exists())

    def test_attachment_type_size_and_shape_are_validated(self):
        good = f"messages/{self.conv_a.id}/abc"
        bad = [
            {"s3_key": good, "mime": "text/html", "size": 10},
            {"s3_key": good, "mime": "image/png", "size": 10**9},
            {"s3_key": good, "mime": "image/png", "size": -1},
            {"s3_key": good, "mime": "image/png", "size": "10"},
            "not-a-dict",
        ]
        for att in bad:
            response = self.client.post(self.url(self.conv_a, "send_message/"), {"body": "hi", "attachments": [att]}, format="json")
            self.assertEqual(response.status_code, 400, att)

    def test_bad_body_types_are_400_not_500(self):
        for body in (None, 5, ["x"], {"a": 1}, "", "   ", "a" * 5001):
            response = self.client.post(self.url(self.conv_a, "send_message/"), {"body": body}, format="json")
            self.assertEqual(response.status_code, 400, repr(body)[:20])

    def test_valid_message_with_own_attachment_is_accepted(self):
        att = {"s3_key": f"messages/{self.conv_a.id}/abc", "mime": "image/png", "size": 1024}
        response = self.client.post(self.url(self.conv_a, "send_message/"), {"body": "hello", "attachments": [att]}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.json()["attachments"]), 1)

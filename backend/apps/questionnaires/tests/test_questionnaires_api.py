from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.questionnaires.models import Questionnaire, QuestionnaireVersion
from apps.questionnaires.validation import validate_field_value

User = get_user_model()


class QuestionnaireValidationTests(TestCase):
    def test_email_validation(self):
        error = validate_field_value(
            field_type="email",
            value="not-an-email",
            required=True,
            validation_rules=[],
            label="Email",
        )
        self.assertIsNotNone(error)

    def test_sql_injection_rejected(self):
        error = validate_field_value(
            field_type="text",
            value="'; DROP TABLE users;--",
            required=True,
            validation_rules=[],
            label="Name",
        )
        self.assertIsNotNone(error)


class QuestionnaireStaffApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.questionnaire = Questionnaire.objects.create(slug="qualify", title="Qualify")
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=self.questionnaire,
            version_label="1.0.0",
        )

    def test_staff_can_list_questionnaires(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/staff/questionnaires/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_active_questionnaire_404_without_publish(self):
        response = self.client.get("/api/questionnaires/qualify/active/")
        self.assertEqual(response.status_code, 404)

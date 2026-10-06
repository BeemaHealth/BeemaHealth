from django.test import TestCase

from apps.questionnaires.beluga_payload import (
    BELUGA_VISIT_REQUIRED_MAPPINGS,
    build_beluga_visit_payload,
    beluga_payload_is_ready,
)
from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


class BelugaPayloadTests(TestCase):
    def setUp(self):
        self.intake_q = Questionnaire.objects.create(
            slug="intake-test",
            questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
            title="Intake test",
        )
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=self.intake_q,
            version_label="1.0.0",
        )
        self.step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="clinical",
            sort_order=0,
            title="Clinical",
        )
        QuestionnaireField.objects.create(
            step=self.step,
            field_key="meds",
            field_type=QuestionnaireField.FieldType.TEXTAREA,
            label="Medications",
            maps_to_section="beluga:selfReportedMeds",
            sort_order=0,
        )

        QuestionnaireField.objects.create(
            step=self.step,
            field_key="allergies",
            field_type=QuestionnaireField.FieldType.TEXTAREA,
            label="Allergies",
            maps_to_section="beluga:allergies",
            sort_order=1,
        )
        QuestionnaireField.objects.create(
            step=self.step,
            field_key="conditions",
            field_type=QuestionnaireField.FieldType.TEXTAREA,
            label="Conditions",
            maps_to_section="beluga:medicalConditions",
            sort_order=2,
        )
        QuestionnaireField.objects.create(
            step=self.step,
            field_key="sex",
            field_type=QuestionnaireField.FieldType.SINGLE_CHOICE,
            label="Sex",
            maps_to_section="beluga:sex",
            options=[{"value": "female", "label": "Female"}],
            sort_order=3,
        )
        QuestionnaireField.objects.create(
            step=self.step,
            field_key="dob",
            field_type=QuestionnaireField.FieldType.DOB,
            label="DOB",
            maps_to_section="beluga:dob",
            sort_order=4,
        )
        QuestionnaireField.objects.create(
            step=self.step,
            field_key="ship",
            field_type=QuestionnaireField.FieldType.ADDRESS_GROUP,
            label="Address",
            options=[
                {"value": "address", "label": "Street", "beluga": "beluga:address"},
                {"value": "city", "label": "City", "beluga": "beluga:city"},
                {"value": "state", "label": "State", "beluga": "beluga:state"},
                {"value": "zip", "label": "ZIP", "beluga": "beluga:zip"},
            ],
            sort_order=5,
        )

    def test_build_payload_marks_required_fields_from_account_extras(self):
        payload = build_beluga_visit_payload(
            intake_version=self.version,
            intake_responses={
                "meds": "None",
                "allergies": "None",
                "conditions": "None",
                "sex": "female",
                "dob": "1990-01-15",
                "ship": {
                    "address": "123 Main St",
                    "city": "Denver",
                    "state": "CO",
                    "zip": "80202",
                    "verified": True,
                },
            },
            account={
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
                "phone": "5555555555",
                "dob": "1990-01-15",
                "state": "CO",
            },
            identity_contact={
                "address": "123 Main St",
                "city": "Denver",
                "zip": "80202",
            },
            sex="female",
        )
        self.assertTrue(payload["ready"])
        self.assertEqual(payload["ready_count"], len(BELUGA_VISIT_REQUIRED_MAPPINGS))
        self.assertEqual(payload["form_obj"]["firstName"], "Jane")
        self.assertEqual(payload["form_obj"]["selfReportedMeds"], "None")
        self.assertTrue(beluga_payload_is_ready(payload))

    def test_build_payload_reports_missing_required_fields(self):
        payload = build_beluga_visit_payload(
            intake_version=self.version,
            intake_responses={},
            account={"first_name": "Jane"},
        )
        self.assertFalse(payload["ready"])
        self.assertGreater(len(payload["missing"]), 0)
        self.assertFalse(beluga_payload_is_ready(payload))

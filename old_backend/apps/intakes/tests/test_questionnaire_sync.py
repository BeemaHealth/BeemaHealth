from django.test import TestCase

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.questionnaire_sync import (
    format_us_state_name,
    sync_canonical_fields_from_questionnaire,
)
from apps.patients.models import PatientProfile
from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


class QuestionnaireSyncTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Matt",
            last_name="Aertker",
            phone="7195106341",
        )
        questionnaire = Questionnaire.objects.create(
            slug="intake-sync",
            title="Intake",
            questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
        )
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label="1.0.0",
        )
        step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="profile",
            sort_order=0,
            title="Profile",
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="dob",
            field_type=QuestionnaireField.FieldType.DOB,
            label="DOB",
            maps_to_section="beluga:dob",
            sort_order=0,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="sex",
            field_type=QuestionnaireField.FieldType.SINGLE_CHOICE,
            label="Sex",
            maps_to_section="beluga:sex",
            options=[
                {"value": "female", "label": "Female"},
                {"value": "male", "label": "Male"},
            ],
            sort_order=1,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="ship",
            field_type=QuestionnaireField.FieldType.ADDRESS_GROUP,
            label="Address",
            options=[
                {"value": "state", "label": "State", "beluga": "beluga:state"},
            ],
            sort_order=2,
        )
        self.intake = MedicalIntake.objects.create(
            user=self.user,
            questionnaire_version_id=self.version.id,
            questionnaire_responses={
                "dob": "1990-06-15",
                "sex": "male",
                "ship": {
                    "address": "2510 Oak Street",
                    "city": "Phoenix",
                    "state": "AZ",
                    "zip": "85001",
                    "verified": True,
                },
            },
            medication_preferences={
                "shipping_state": "AZ",
            },
        )

    def test_sync_writes_dob_state_and_sex_to_canonical_tables(self):
        sync_canonical_fields_from_questionnaire(self.intake)
        self.user.refresh_from_db()
        profile = PatientProfile.objects.get(user=self.user)
        self.assertEqual(str(self.user.dob), "1990-06-15")
        self.assertEqual(self.user.state, "Arizona")
        self.assertEqual(profile.sex_assigned_at_birth, "male")

    def test_format_us_state_name(self):
        self.assertEqual(format_us_state_name("CO"), "Colorado")
        self.assertEqual(format_us_state_name("colorado"), "Colorado")

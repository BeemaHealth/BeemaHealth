from django.test import TestCase

from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)
from apps.questionnaires.services import publish_version

ROUTING = [
    {"when_field": "x", "when_value": "1", "intake_questionnaire_slug": "intake"}
]


class PaymentFieldPublishTests(TestCase):
    def setUp(self):
        self.qualify = Questionnaire.objects.create(
            slug="qualify-pay",
            title="Qualify",
            questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        )
        self.intake = Questionnaire.objects.create(
            slug="intake-pay",
            title="Intake",
            questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
        )

    def _qualify_version(self):
        version = QuestionnaireVersion.objects.create(
            questionnaire=self.qualify,
            version_label="1.0.0",
            intake_routing_rules=ROUTING,
        )
        return version

    def _intake_version(self):
        return QuestionnaireVersion.objects.create(
            questionnaire=self.intake,
            version_label="1.0.0",
        )

    def _add_payment_field(self, step, sort_order=1, payment_mode="auth_hold"):
        return QuestionnaireField.objects.create(
            step=step,
            field_key="payment",
            field_type=QuestionnaireField.FieldType.PLUGIN,
            plugin_id="stripe_payment_hold",
            label="Payment",
            sort_order=sort_order,
            options={"payment_mode": payment_mode} if payment_mode else {},
        )

    def _add_account_field(self, step, sort_order=0):
        return QuestionnaireField.objects.create(
            step=step,
            field_key="account",
            field_type=QuestionnaireField.FieldType.ACCOUNT,
            label="Account",
            sort_order=sort_order,
        )

    def test_qualify_payment_field_without_account_field_rejected(self):
        version = self._qualify_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_payment_field(step)

        with self.assertRaisesMessage(ValueError, "same step as the account field"):
            publish_version(version)

    def test_qualify_payment_field_after_account_field_on_same_step_publishes(self):
        version = self._qualify_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_account_field(step, sort_order=0)
        self._add_payment_field(step, sort_order=1)

        published = publish_version(version)
        self.assertEqual(published.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_qualify_payment_field_before_account_field_rejected(self):
        version = self._qualify_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_account_field(step, sort_order=1)
        self._add_payment_field(step, sort_order=0)

        with self.assertRaisesMessage(ValueError, "must come after the account field"):
            publish_version(version)

    def test_two_payment_fields_rejected(self):
        version = self._qualify_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_account_field(step, sort_order=0)
        self._add_payment_field(step, sort_order=1)
        step2 = QuestionnaireStep.objects.create(version=version, step_key="s2", sort_order=1, title="Step 2")
        self._add_payment_field(step2, sort_order=0)

        with self.assertRaisesMessage(ValueError, "Only one payment field"):
            publish_version(version)

    def test_intake_payment_field_without_account_field_publishes(self):
        # Intake versions never have an account field — the patient already
        # authenticated during qualify — so no adjacency check applies.
        version = self._intake_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_payment_field(step)

        published = publish_version(version)
        self.assertEqual(published.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_invalid_payment_mode_rejected(self):
        version = self._intake_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_payment_field(step, payment_mode="not_a_real_mode")

        with self.assertRaisesMessage(ValueError, "payment_mode must be one of"):
            publish_version(version)

    def test_missing_payment_mode_defaults_to_auth_hold(self):
        version = self._intake_version()
        step = QuestionnaireStep.objects.create(version=version, step_key="s1", sort_order=0, title="Step")
        self._add_payment_field(step, payment_mode=None)

        published = publish_version(version)
        self.assertEqual(published.status, QuestionnaireVersion.Status.PUBLISHED)

from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.integrations.adapters.beluga import BelugaWebhookEvent
from apps.integrations.services import apply_beluga_webhook
from apps.intakes.models import MedicalIntake
from apps.patients import notifications as notif_module
from apps.patients.models import PatientCareEvent, PatientSettings
from apps.patients.notifications import notify_care_team_message, notify_patient_event
from apps.reviews.models import ProviderReview


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SMS_BACKEND="console",
    FRONTEND_URL="http://localhost:8080",
)
class BelugaWebhookNotificationTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        PatientSettings.objects.create(
            user=self.patient,
            email_notifications=True,
            sms_notifications=False,
        )
        MedicalIntake.objects.create(
            user=self.patient,
            status="under_review",
            submitted_at=timezone.now(),
        )
        ProviderReview.objects.create(
            user=self.patient,
            status="under_review",
            external_review_id="beluga-master-001",
        )

        # Run notifications synchronously so background threads don't bleed
        # emails into other tests' outboxes (and to avoid DB access off-thread).
        care_team_patch = patch(
            "apps.integrations.services.queue_care_team_message_notification",
            side_effect=lambda user, **kwargs: notify_care_team_message(
                user, **kwargs
            ),
        )
        status_patch = patch.object(
            notif_module,
            "queue_patient_event",
            side_effect=lambda user, **kwargs: notify_patient_event(user, **kwargs),
        )
        care_team_patch.start()
        status_patch.start()
        self.addCleanup(care_team_patch.stop)
        self.addCleanup(status_patch.stop)
        mail.outbox.clear()

    def test_doctor_chat_appends_note_and_queues_email(self):
        event = BelugaWebhookEvent(
            master_id="beluga-master-001",
            event="DOCTOR_CHAT",
            content="hello i need more info",
        )

        result = apply_beluga_webhook(event)

        review = ProviderReview.objects.get(user=self.patient)
        self.assertIn("[Provider] hello i need more info", review.patient_note)
        self.assertTrue(result["appended_message"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("hello i need more info", mail.outbox[0].body)

    def test_cs_message_appends_support_note(self):
        event = BelugaWebhookEvent(
            master_id="beluga-master-001",
            event="CS_MESSAGE",
            content="Please call support.",
        )

        apply_beluga_webhook(event)

        review = ProviderReview.objects.get(user=self.patient)
        self.assertIn("[Support] Please call support.", review.patient_note)

    def test_shipping_event_sends_status_notification(self):
        event = BelugaWebhookEvent(
            master_id="beluga-master-001",
            event="PHARMACY_ORDER_SHIPPED",
            order_id="order-001",
        )

        result = apply_beluga_webhook(event)

        self.assertTrue(result["logged"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("order", mail.outbox[0].subject.lower())
        care_event = PatientCareEvent.objects.get(user=self.patient)
        self.assertEqual(care_event.milestone, "pharmacy-shipped")
        self.assertEqual(care_event.source_event, "PHARMACY_ORDER_SHIPPED")

    def test_fulfillment_event_persists_for_timeline(self):
        event = BelugaWebhookEvent(
            master_id="beluga-master-001",
            event="PHARMACY_ORDER_IN_FULFILLMENT",
            order_id="order-001",
        )

        apply_beluga_webhook(event)

        care_event = PatientCareEvent.objects.get(user=self.patient)
        self.assertEqual(care_event.milestone, "pharmacy-in-fulfillment")
        self.assertEqual(care_event.title, "Order in fulfillment")

    def test_shipping_category_toggle_off_suppresses_notification(self):
        settings_obj = self.patient.patient_settings
        settings_obj.notify_shipping = False
        settings_obj.save(update_fields=["notify_shipping"])

        event = BelugaWebhookEvent(
            master_id="beluga-master-001",
            event="PHARMACY_ORDER_SHIPPED",
            order_id="order-001",
        )

        apply_beluga_webhook(event)

        self.assertEqual(len(mail.outbox), 0)

    def test_rx_written_sends_prescription_notification(self):
        event = BelugaWebhookEvent(
            master_id="beluga-master-001",
            event="RX_WRITTEN",
            meds_prescribed=[],
        )

        apply_beluga_webhook(event)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("prescription", mail.outbox[0].subject.lower())

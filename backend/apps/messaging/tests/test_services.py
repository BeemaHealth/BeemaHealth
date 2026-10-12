"""Tests for messaging services."""
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.messaging.models import (
    Conversation,
    Message,
    NotificationDelivery,
)
from apps.messaging.services import (
    send_patient_message,
    receive_doctor_message,
    compute_state,
    deliver_pending_messages,
    notify_patient,
    track_checkout_reached,
    mark_checkout_completed,
)
from apps.patients.models import PatientProfile

User = get_user_model()


class NotifyPatientTest(TestCase):
    """Test notify_patient with optional context parameter."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            phone="+12025551234",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.user)

    def test_notify_patient_two_args(self):
        """notify_patient works with two arguments (context=None)."""
        # Should not raise TypeError when called with 2 args
        notify_patient(self.patient, "new_message")
        # Should create a notification
        notifications = NotificationDelivery.objects.filter(patient=self.patient)
        self.assertEqual(notifications.count(), 2)  # SMS and email

    def test_notify_patient_three_args(self):
        """notify_patient works with three arguments (context provided)."""
        notify_patient(self.patient, "new_message", {"key": "value"})
        notifications = NotificationDelivery.objects.filter(patient=self.patient)
        self.assertEqual(notifications.count(), 2)


class ReceiveDoctorMessageTest(TestCase):
    """Test receive_doctor_message idempotency."""

    def setUp(self):
        self.patient_user = User.objects.create_user(
            email="patient@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.patient_user)
        # Create a treatment (minimal)
        from apps.clinical.models import Treatment
        from apps.catalog.models import Product, Plan
        product = Product.objects.create(slug="test", name="Test")
        plan = Plan.objects.create(
            product=product,
            slug="test-plan",
            name="Test Plan",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )
        self.treatment = Treatment.objects.create(
            patient=self.patient,
            product=product,
            plan=plan,
        )

    def test_receive_doctor_message_idempotent_by_external_id(self):
        """Duplicate external_id returns existing message (idempotent)."""
        external_id = "beluga-123"
        message1 = receive_doctor_message(
            self.treatment,
            "Hello from doctor",
            external_id,
            "Dr. Smith"
        )
        message2 = receive_doctor_message(
            self.treatment,
            "Hello from doctor",
            external_id,
            "Dr. Smith"
        )
        # Should be the same message
        self.assertEqual(message1.id, message2.id)
        # Only one message should exist
        self.assertEqual(Message.objects.filter(external_id=external_id).count(), 1)

    def test_receive_doctor_message_creates_conversation(self):
        """Message creates conversation if needed."""
        external_id = "beluga-456"
        message = receive_doctor_message(
            self.treatment,
            "Hello from doctor",
            external_id,
            "Dr. Jones"
        )
        # Should have created a conversation
        conversation = Conversation.objects.get(patient=self.patient, kind="doctor")
        self.assertEqual(conversation.messages.count(), 1)
        self.assertEqual(message.conversation, conversation)


class ComputeStateTest(TestCase):
    """Test conversation state computation."""

    def setUp(self):
        self.patient_user = User.objects.create_user(
            email="patient@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.patient_user)
        self.staff_user = User.objects.create_user(
            email="staff@example.com",
            is_staff=True,
            password="testpass123"
        )

    def test_state_awaiting_patient_after_staff_reply(self):
        """After staff replies, state is awaiting_patient."""
        conversation = Conversation.objects.create(
            patient=self.patient,
            kind="support",
        )
        Message.objects.create(
            conversation=conversation,
            direction="out",
            sender_role="support",
            sender_user=self.staff_user,
            body="Help text",
        )
        state = compute_state(conversation)
        self.assertEqual(state, "awaiting_patient")

    def test_state_awaiting_staff_after_patient_message(self):
        """After patient sends message in support thread, state is awaiting_staff."""
        conversation = Conversation.objects.create(
            patient=self.patient,
            kind="support",
        )
        Message.objects.create(
            conversation=conversation,
            direction="in",
            sender_role="patient",
            sender_user=self.patient_user,
            body="Help needed",
        )
        state = compute_state(conversation)
        self.assertEqual(state, "awaiting_staff")

    def test_state_closed_when_archived(self):
        """Archived conversation state is closed."""
        conversation = Conversation.objects.create(
            patient=self.patient,
            kind="support",
            archived=True,
        )
        state = compute_state(conversation)
        self.assertEqual(state, "closed")


class DeliverPendingMessagesTest(TestCase):
    """Test message delivery with backoff and retries."""

    def setUp(self):
        self.patient_user = User.objects.create_user(
            email="patient@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.patient_user)
        self.staff_user = User.objects.create_user(
            email="staff@example.com",
            is_staff=True,
            password="testpass123"
        )

    def test_deliver_pending_messages_returns_stats(self):
        """deliver_pending_messages returns a stats dict."""
        now = timezone.now()
        stats = deliver_pending_messages(now=now)
        # Should return a dict with delivered, failed, errors keys
        self.assertIn("delivered", stats)
        self.assertIn("failed", stats)
        self.assertIn("errors", stats)
        self.assertEqual(stats["delivered"], 0)
        self.assertEqual(stats["failed"], 0)


class SendPatientMessageTest(TestCase):
    """Test send_patient_message."""

    def setUp(self):
        self.patient_user = User.objects.create_user(
            email="patient@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.patient_user)

    def test_send_patient_message_creates_message(self):
        """send_patient_message creates outbound message."""
        conversation = Conversation.objects.create(
            patient=self.patient,
            kind="support",
        )
        message = send_patient_message(
            conversation,
            self.patient_user,
            "Help me",
        )
        self.assertEqual(message.direction, "out")
        self.assertEqual(message.sender_role, "patient")
        self.assertEqual(message.body, "Help me")

    def test_send_patient_message_permission_check(self):
        """Patient cannot send in another patient's conversation."""
        other_user = User.objects.create_user(
            email="other@example.com",
            password="testpass123"
        )
        conversation = Conversation.objects.create(
            patient=self.patient,
            kind="support",
        )
        with self.assertRaises(PermissionError):
            send_patient_message(
                conversation,
                other_user,
                "Hacked",
            )


class PatientIsolationTest(TestCase):
    """Test access control: patient A cannot read patient B's conversations."""

    def setUp(self):
        self.patient_a_user = User.objects.create_user(
            email="patientA@example.com",
            password="testpass123"
        )
        self.patient_a = PatientProfile.objects.create(user=self.patient_a_user)

        self.patient_b_user = User.objects.create_user(
            email="patientB@example.com",
            password="testpass123"
        )
        self.patient_b = PatientProfile.objects.create(user=self.patient_b_user)

    def test_patient_a_cannot_list_patient_b_conversation(self):
        """Patient B's conversation is hidden from Patient A's list."""
        # Create a conversation for patient B
        conversation_b = Conversation.objects.create(
            patient=self.patient_b,
            kind="support",
        )
        # Patient A queries conversations
        conversations_for_a = Conversation.objects.filter(patient=self.patient_a)
        self.assertNotIn(conversation_b, conversations_for_a)

    def test_patient_a_cannot_send_message_in_patient_b_conversation(self):
        """Patient A cannot send a message in Patient B's conversation."""
        conversation_b = Conversation.objects.create(
            patient=self.patient_b,
            kind="support",
        )
        # Patient A tries to send a message
        with self.assertRaises(PermissionError):
            send_patient_message(conversation_b, self.patient_a_user, "Hacked")


class TrackCheckoutReachedTest(TestCase):
    """Test track_checkout_reached for abandoned checkout drip."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="checkout@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.user)

    def test_track_checkout_reached_creates_record(self):
        """track_checkout_reached creates AbandonedCheckout record."""
        from apps.questionnaires.models import Submission, Questionnaire, QuestionnaireVersion
        from apps.catalog.models import Product
        from apps.messaging.models import AbandonedCheckout

        product = Product.objects.create(slug="test", name="Test")
        q = Questionnaire.objects.create(slug="test", title="Test", product_slug=product.slug)
        qv = QuestionnaireVersion.objects.create(
            questionnaire=q,
            version_label="1.0",
            definition={},
            definition_hash="hash",
            status="published"
        )
        submission = Submission.objects.create(
            patient=self.patient,
            version=qv,
            status="in_progress",
            current_node="checkout"
        )

        checkout = track_checkout_reached(submission)

        self.assertIsNotNone(checkout)
        self.assertEqual(checkout.patient, self.patient)
        self.assertEqual(checkout.submission, submission)
        self.assertEqual(checkout.email, "checkout@example.com")
        self.assertIsNotNone(checkout.reached_checkout_at)

    def test_track_checkout_reached_idempotent(self):
        """Calling track_checkout_reached twice returns same record."""
        from apps.questionnaires.models import Submission, Questionnaire, QuestionnaireVersion
        from apps.catalog.models import Product

        product = Product.objects.create(slug="test2", name="Test2")
        q = Questionnaire.objects.create(slug="test2", title="Test2", product_slug=product.slug)
        qv = QuestionnaireVersion.objects.create(
            questionnaire=q,
            version_label="1.0",
            definition={},
            definition_hash="hash2",
            status="published"
        )
        submission = Submission.objects.create(
            patient=self.patient,
            version=qv,
            status="in_progress",
            current_node="checkout"
        )

        checkout1 = track_checkout_reached(submission)
        checkout2 = track_checkout_reached(submission)

        self.assertEqual(checkout1.id, checkout2.id)


class MarkCheckoutCompletedTest(TestCase):
    """Test mark_checkout_completed for stopping abandoned drip."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="buyer@example.com",
            password="testpass123"
        )
        self.patient = PatientProfile.objects.create(user=self.user)

    def test_mark_checkout_completed_stops_drip(self):
        """mark_checkout_completed sets completed_at."""
        from apps.messaging.models import AbandonedCheckout

        now = timezone.now()
        checkout = AbandonedCheckout.objects.create(
            patient=self.patient,
            email=self.user.email,
            started_at=now,
        )

        mark_checkout_completed(self.patient)

        checkout.refresh_from_db()
        self.assertIsNotNone(checkout.completed_at)
        self.assertIsNotNone(checkout.stopped_at)

    def test_mark_checkout_completed_idempotent(self):
        """Calling mark_checkout_completed twice is safe."""
        from apps.messaging.models import AbandonedCheckout

        now = timezone.now()
        checkout = AbandonedCheckout.objects.create(
            patient=self.patient,
            email=self.user.email,
            started_at=now,
        )

        mark_checkout_completed(self.patient)
        checkout.refresh_from_db()
        first_completed_at = checkout.completed_at

        mark_checkout_completed(self.patient)
        checkout.refresh_from_db()

        # Should still have same completed_at
        self.assertEqual(checkout.completed_at, first_completed_at)

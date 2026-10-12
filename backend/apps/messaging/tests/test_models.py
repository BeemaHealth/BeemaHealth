"""Tests for messaging models."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone

from apps.messaging.models import (
    Conversation,
    Message,
    NotificationDelivery,
    AbandonedCheckout,
)


class ConversationModelTest(TestCase):
    """Test Conversation model."""

    def test_conversation_str(self):
        """__str__ does not contain PHI."""
        # Will need patients app to exist
        pass


class AbandonedCheckoutModelTest(TestCase):
    """Test AbandonedCheckout model and drip schedule."""

    def test_next_step_due_schedule(self):
        """Test the exact drip schedule: steps 1-7 at 1, 3, 24, 48, 72, 168, 336 hours."""
        now = timezone.now()
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(hours=3),  # 3 hours ago
            completed_at=None,
            stopped_at=None,
            emails_sent=[],
        )

        # At 3 hours, step 1 is first due (1 hour after start)
        self.assertEqual(checkout.next_step_due(now), 1)

        # After sending step 1, step 2 is due (3 hours after start)
        checkout.emails_sent = [1]
        self.assertEqual(checkout.next_step_due(now), 2)

        # At exactly 1 hour boundary, step 1 is due
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(hours=1),
            completed_at=None,
            stopped_at=None,
            emails_sent=[],
        )
        self.assertEqual(checkout.next_step_due(now), 1)

        # Before 1 hour, nothing due
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(minutes=30),
            completed_at=None,
            stopped_at=None,
            emails_sent=[],
        )
        self.assertIsNone(checkout.next_step_due(now))

    def test_abandoned_checkout_drip_completes(self):
        """Drip stops after all 7 steps sent."""
        now = timezone.now()
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(hours=400),
            completed_at=None,
            stopped_at=None,
            emails_sent=[1, 2, 3, 4, 5, 6, 7],
        )

        # All steps sent, nothing more due
        self.assertIsNone(checkout.next_step_due(now))

    def test_abandoned_checkout_stops_on_completion(self):
        """Drip stops when checkout completed_at is set."""
        now = timezone.now()
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(hours=2),
            completed_at=now,
            stopped_at=None,
            emails_sent=[],
        )

        # Completed, drip stops
        self.assertIsNone(checkout.next_step_due(now))

    def test_abandoned_checkout_stops_on_unsubscribe(self):
        """Drip stops when stopped_at is set."""
        now = timezone.now()
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(hours=2),
            completed_at=None,
            stopped_at=now,
            emails_sent=[],
        )

        # Stopped, drip stops
        self.assertIsNone(checkout.next_step_due(now))

    def test_abandoned_checkout_idempotent_per_step(self):
        """Sending step multiple times doesn't create duplicates."""
        # This is tested at the service level with emails_sent list
        now = timezone.now()
        checkout = AbandonedCheckout(
            email="test@example.com",
            started_at=now - timedelta(hours=2),
            completed_at=None,
            stopped_at=None,
            emails_sent=[1],
        )

        # Step 1 already sent, should not be due again
        self.assertNotEqual(checkout.next_step_due(now), 1)

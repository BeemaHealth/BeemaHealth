from unittest.mock import patch

from django.test import TestCase

from apps.accounts.models import User
from apps.payments.models import AuthorizationHold
from apps.payments.services import (
    IllegalStateTransition,
    cancel_hold,
    capture_hold,
    transition_hold,
)


def make_hold(user, status=AuthorizationHold.Status.HELD, amount_cents=2500):
    return AuthorizationHold.objects.create(
        user=user,
        payment_mode=AuthorizationHold.PaymentMode.AUTH_HOLD,
        amount_cents=amount_cents,
        status=status,
        stripe_payment_intent_id="pi_test_123",
        idempotency_key=f"hold-test-{user.id}-{status}",
    )


class HoldStateMachineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com", password="secure-pass-1"
        )

    def test_legal_transition_created_to_processing(self):
        hold = make_hold(self.user, status=AuthorizationHold.Status.CREATED)
        transition_hold(hold, AuthorizationHold.Status.PROCESSING)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.PROCESSING)

    def test_illegal_transition_raises(self):
        hold = make_hold(self.user, status=AuthorizationHold.Status.HELD)
        with self.assertRaises(IllegalStateTransition):
            transition_hold(hold, AuthorizationHold.Status.PROCESSING)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.HELD)

    def test_held_sets_expiry_seven_days_out(self):
        hold = make_hold(self.user, status=AuthorizationHold.Status.PROCESSING)
        transition_hold(hold, AuthorizationHold.Status.HELD)
        hold.refresh_from_db()
        self.assertIsNotNone(hold.held_at)
        self.assertEqual((hold.expires_at - hold.held_at).days, 7)

    @patch("stripe.PaymentIntent.capture")
    def test_capture_hold_success(self, mock_capture):
        hold = make_hold(self.user, status=AuthorizationHold.Status.HELD, amount_cents=2500)
        capture_hold(hold)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.CAPTURED)
        self.assertEqual(hold.captured_amount_cents, 2500)
        mock_capture.assert_called_once()

    @patch("stripe.PaymentIntent.capture")
    def test_capture_partial_amount(self, mock_capture):
        hold = make_hold(self.user, status=AuthorizationHold.Status.HELD, amount_cents=2500)
        capture_hold(hold, amount_to_capture_cents=1500)
        hold.refresh_from_db()
        self.assertEqual(hold.captured_amount_cents, 1500)

    def test_capture_wrong_status_raises(self):
        hold = make_hold(self.user, status=AuthorizationHold.Status.CREATED)
        with self.assertRaises(IllegalStateTransition):
            capture_hold(hold)

    @patch("stripe.PaymentIntent.capture")
    def test_capture_amount_exceeding_authorized_raises_without_calling_stripe(self, mock_capture):
        hold = make_hold(self.user, status=AuthorizationHold.Status.HELD, amount_cents=2500)
        with self.assertRaises(ValueError):
            capture_hold(hold, amount_to_capture_cents=5000)
        mock_capture.assert_not_called()
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.HELD)

    @patch("stripe.PaymentIntent.cancel")
    def test_cancel_hold_from_held(self, mock_cancel):
        hold = make_hold(self.user, status=AuthorizationHold.Status.HELD)
        cancel_hold(hold, reason="abandoned")
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.CANCELED)
        self.assertEqual(hold.status_reason, "abandoned")
        mock_cancel.assert_called_once_with(
            "pi_test_123", cancellation_reason="abandoned"
        )

    @patch("stripe.PaymentIntent.cancel")
    def test_cancel_hold_noop_when_already_captured(self, mock_cancel):
        hold = make_hold(self.user, status=AuthorizationHold.Status.CAPTURED)
        result = cancel_hold(hold, reason="disqualified")
        mock_cancel.assert_not_called()
        self.assertEqual(result.status, AuthorizationHold.Status.CAPTURED)

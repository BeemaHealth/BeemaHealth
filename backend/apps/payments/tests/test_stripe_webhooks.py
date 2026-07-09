import hashlib
import hmac
import json
import time
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.payments.models import AuthorizationHold, StripeWebhookEvent
from apps.payments.tests.factories import make_patient_with_payment_field

WEBHOOK_SECRET = "whsec_test_secret_abc123"


def sign(payload: bytes, secret: str = WEBHOOK_SECRET) -> str:
    """Replicates Stripe's documented webhook signing scheme (t=...,v1=...)."""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload.decode()}".encode()
    signature = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


def make_hold(user, payment_intent_id="pi_test_123", status_=AuthorizationHold.Status.PROCESSING):
    return AuthorizationHold.objects.create(
        user=user,
        payment_mode=AuthorizationHold.PaymentMode.AUTH_HOLD,
        amount_cents=2500,
        status=status_,
        stripe_payment_intent_id=payment_intent_id,
        idempotency_key=f"hold-{payment_intent_id}",
    )


@override_settings(STRIPE_WEBHOOK_SECRET=WEBHOOK_SECRET, STRIPE_SECRET_KEY="rk_test_fake")
class StripeWebhookTests(TestCase):
    def setUp(self):
        self.user, self.intake, self.version = make_patient_with_payment_field()
        self.client = APIClient()

    def _post(self, event_dict):
        payload = json.dumps(event_dict).encode()
        sig = sign(payload)
        return self.client.post(
            reverse("stripe-webhook"),
            data=payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=sig,
        )

    def test_invalid_signature_returns_400(self):
        payload = json.dumps({"id": "evt_1", "type": "payment_intent.payment_failed", "data": {"object": {}}}).encode()
        response = self.client.post(
            reverse("stripe-webhook"),
            data=payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=123,v1=deadbeef",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("stripe.PaymentMethod.retrieve")
    def test_amount_capturable_updated_marks_held_and_saves_pm(self, mock_pm_retrieve):
        hold = make_hold(self.user)
        mock_pm_retrieve.return_value = MagicMock(
            id="pm_test_123",
            card={"brand": "visa", "last4": "4242", "exp_month": 12, "exp_year": 2030},
        )
        event = {
            "id": "evt_capturable_1",
            "type": "payment_intent.amount_capturable_updated",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "payment_method": "pm_test_123",
                    "metadata": {"hold_id": str(hold.id), "user_id": str(self.user.id), "intake_id": ""},
                }
            },
        }
        response = self._post(event)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.HELD)
        self.assertTrue(self.user.stripe_payment_methods.filter(card_last4="4242").exists())

    def test_duplicate_event_id_is_idempotent(self):
        hold = make_hold(self.user)
        event = {
            "id": "evt_dup_1",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "last_payment_error": {"code": "card_declined"},
                    "metadata": {"hold_id": str(hold.id)},
                }
            },
        }
        first = self._post(event)
        second = self._post(event)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(second.data["duplicate"])
        self.assertEqual(StripeWebhookEvent.objects.filter(stripe_event_id="evt_dup_1").count(), 1)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.FAILED)

    def test_payment_failed_marks_hold_failed(self):
        hold = make_hold(self.user)
        event = {
            "id": "evt_failed_1",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "last_payment_error": {"code": "insufficient_funds"},
                    "metadata": {"hold_id": str(hold.id)},
                }
            },
        }
        response = self._post(event)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.FAILED)
        self.assertEqual(hold.status_reason, "insufficient_funds")

    def test_canceled_with_expired_reason_marks_expired(self):
        hold = make_hold(self.user, status_=AuthorizationHold.Status.HELD)
        event = {
            "id": "evt_canceled_1",
            "type": "payment_intent.canceled",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "cancellation_reason": "expired",
                    "metadata": {"hold_id": str(hold.id)},
                }
            },
        }
        response = self._post(event)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.EXPIRED)

    def test_our_own_cancel_marks_canceled_not_expired(self):
        hold = make_hold(self.user, status_=AuthorizationHold.Status.HELD)
        event = {
            "id": "evt_canceled_2",
            "type": "payment_intent.canceled",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "cancellation_reason": "requested_by_customer",
                    "metadata": {"hold_id": str(hold.id)},
                }
            },
        }
        response = self._post(event)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.CANCELED)

    def test_out_of_order_capturable_after_capture_is_noop(self):
        # Simulates a webhook arriving late, after we already captured — the
        # state machine must reject HELD-only transitions from CAPTURED
        # rather than erroring or corrupting the row.
        hold = make_hold(self.user, status_=AuthorizationHold.Status.CAPTURED)
        hold.captured_amount_cents = 2500
        hold.save()
        event = {
            "id": "evt_late_1",
            "type": "payment_intent.amount_capturable_updated",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "payment_method": "",
                    "metadata": {"hold_id": str(hold.id)},
                }
            },
        }
        response = self._post(event)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        hold.refresh_from_db()
        self.assertEqual(hold.status, AuthorizationHold.Status.CAPTURED)

    def test_unknown_hold_id_returns_200_not_handled(self):
        event = {
            "id": "evt_unknown_1",
            "type": "payment_intent.payment_failed",
            "data": {"object": {"id": "pi_ghost", "metadata": {"hold_id": "00000000-0000-0000-0000-000000000000"}}},
        }
        response = self._post(event)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["handled"])

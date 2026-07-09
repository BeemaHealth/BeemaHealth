from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

import stripe
from apps.accounts.models import User
from apps.payments.models import AuthorizationHold
from apps.payments.tests.factories import make_patient_with_payment_field


@override_settings(PAYMENTS_ENABLED=True, STRIPE_SECRET_KEY="rk_test_fake")
class PaymentHoldCreateApiTests(TestCase):
    def setUp(self):
        self.user, self.intake, self.version = make_patient_with_payment_field()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_unauthenticated_returns_401(self):
        anon_client = APIClient()
        response = anon_client.post(reverse("payment-hold-create"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_role_returns_403(self):
        staff = User.objects.create_user(
            email="staff@example.com",
            password="secure-pass-1",
            is_staff=True,
            is_patient=False,
        )
        client = APIClient()
        client.force_authenticate(user=staff)
        response = client.post(reverse("payment-hold-create"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_disabled_flag_returns_503(self):
        with override_settings(PAYMENTS_ENABLED=False):
            response = self.client.post(reverse("payment-hold-create"))
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch("stripe.PaymentIntent.retrieve")
    @patch("stripe.PaymentIntent.create")
    @patch("stripe.Customer.create")
    def test_create_hold_success(self, mock_customer_create, mock_pi_create, mock_pi_retrieve):
        mock_customer_create.return_value = MagicMock(id="cus_test_123")
        mock_pi_create.return_value = MagicMock(id="pi_test_123")
        mock_pi_retrieve.return_value = MagicMock(client_secret="pi_test_123_secret_abc")

        response = self.client.post(reverse("payment-hold-create"))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["payment_mode"], "auth_hold")
        self.assertEqual(response.data["amount_cents"], 2500)
        self.assertEqual(response.data["client_secret"], "pi_test_123_secret_abc")
        self.assertEqual(AuthorizationHold.objects.filter(user=self.user).count(), 1)

    @patch("stripe.PaymentIntent.retrieve")
    @patch("stripe.PaymentIntent.create")
    @patch("stripe.Customer.create")
    def test_second_create_call_is_idempotent(self, mock_customer_create, mock_pi_create, mock_pi_retrieve):
        mock_customer_create.return_value = MagicMock(id="cus_test_123")
        mock_pi_create.return_value = MagicMock(id="pi_test_123")
        mock_pi_retrieve.return_value = MagicMock(client_secret="secret_abc")

        first = self.client.post(reverse("payment-hold-create"))
        second = self.client.post(reverse("payment-hold-create"))

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], second.data["id"])
        mock_pi_create.assert_called_once()
        self.assertEqual(AuthorizationHold.objects.filter(user=self.user).count(), 1)

    def test_no_payment_field_configured_returns_409(self):
        user = User.objects.create_user(email="nopay@example.com", password="secure-pass-1")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(reverse("payment-hold-create"))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    @patch("stripe.Customer.create")
    def test_stripe_error_returns_502_with_safe_message(self, mock_customer_create):
        mock_customer_create.side_effect = stripe.error.APIConnectionError("boom")
        response = self.client.post(reverse("payment-hold-create"))
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertNotIn("boom", str(response.data))


@override_settings(PAYMENTS_ENABLED=True, STRIPE_SECRET_KEY="rk_test_fake")
class PaymentHoldMeApiTests(TestCase):
    def setUp(self):
        self.user, self.intake, self.version = make_patient_with_payment_field()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_me_returns_none_when_no_hold(self):
        response = self.client.get(reverse("payment-hold-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data)

    def test_me_returns_held_summary(self):
        AuthorizationHold.objects.create(
            user=self.user,
            payment_mode=AuthorizationHold.PaymentMode.AUTH_HOLD,
            amount_cents=2500,
            status=AuthorizationHold.Status.HELD,
            stripe_payment_intent_id="pi_test_123",
            idempotency_key="hold-test-me",
        )
        response = self.client.get(reverse("payment-hold-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "held")
        self.assertIsNone(response.data["client_secret"])


@override_settings(PAYMENTS_ENABLED=True, STRIPE_SECRET_KEY="rk_test_fake")
class PaymentHoldChangeCardApiTests(TestCase):
    def setUp(self):
        self.user, self.intake, self.version = make_patient_with_payment_field()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_change_card_with_no_active_hold_returns_404(self):
        response = self.client.post(reverse("payment-hold-change-card"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("stripe.PaymentIntent.retrieve")
    @patch("stripe.PaymentIntent.create")
    @patch("stripe.PaymentIntent.cancel")
    @patch("stripe.Customer.create")
    def test_change_card_cancels_old_and_creates_new(
        self, mock_customer_create, mock_cancel, mock_pi_create, mock_pi_retrieve
    ):
        old_hold = AuthorizationHold.objects.create(
            user=self.user,
            payment_mode=AuthorizationHold.PaymentMode.AUTH_HOLD,
            amount_cents=2500,
            status=AuthorizationHold.Status.HELD,
            stripe_payment_intent_id="pi_old_123",
            idempotency_key="hold-test-old",
        )
        mock_customer_create.return_value = MagicMock(id="cus_test_123")
        mock_pi_create.return_value = MagicMock(id="pi_new_456")
        mock_pi_retrieve.return_value = MagicMock(client_secret="secret_new")

        response = self.client.post(reverse("payment-hold-change-card"))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_cancel.assert_called_once_with("pi_old_123", cancellation_reason="requested_by_customer")
        old_hold.refresh_from_db()
        self.assertEqual(old_hold.status, AuthorizationHold.Status.CANCELED)
        new_hold = AuthorizationHold.objects.exclude(id=old_hold.id).get(user=self.user)
        self.assertEqual(new_hold.stripe_payment_intent_id, "pi_new_456")

"""Payment events: idempotency, subscription start, failures, late events, amount checks."""
from __future__ import annotations

from datetime import date, timedelta

from django.utils import timezone

from apps.billing import services
from apps.billing.exceptions import AmountMismatch, BillingError
from apps.billing.models import Invoice, Subscription
from apps.clinical.models import ActionItem, Treatment

from .factories import BillingTestCase, make_plan, make_treatment

CONSENTS = ["no_cancel_after_submit", "auto_renew"]


class PaymentSucceededTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=6, price_cents=149700)
        self.treatment = make_treatment(self.patient, self.product, self.plan)
        self.result = services.create_checkout(
            self.patient, self.plan, consents=CONSENTS, treatment=self.treatment
        )
        self.invoice = self.result.invoice
        self.pi = self.invoice.stripe_payment_intent_id

    def test_marks_paid_and_starts_prepaid_subscription(self) -> None:
        invoice = services.handle_payment_succeeded(self.pi, amount_received_cents=149700, payment_method_id="pm_1")
        self.assertEqual(invoice.status, "paid")
        self.assertIsNotNone(invoice.paid_at)
        sub = invoice.subscription
        self.assertEqual((sub.commitment, sub.term_months, sub.batches_total), ("prepaid_term", 6, 2))
        self.assertIsNone(sub.next_bill_on)
        self.assertEqual(sub.paid_through, sub.term_ends_on - timedelta(days=1))
        self.assertTrue(sub.renews_at_term_end)  # consented to auto-renew
        self.assertEqual(sub.treatment_id, self.treatment.pk)
        self.mock_create_batches.assert_called_once()

    def test_repeated_events_never_double_start(self) -> None:
        for _ in range(4):
            services.handle_payment_succeeded(self.pi)
        self.assertEqual(Subscription.objects.filter(patient=self.patient).count(), 1)
        self.mock_create_batches.assert_called_once()
        self.assertEqual(Invoice.objects.get(pk=self.invoice.pk).subscription.batches_total, 2)

    def test_start_subscription_called_directly_twice_returns_same_row(self) -> None:
        services.handle_payment_succeeded(self.pi)
        invoice = Invoice.objects.get(pk=self.invoice.pk)
        self.assertEqual(services.start_subscription(invoice).pk, services.start_subscription(invoice).pk)
        self.assertEqual(Subscription.objects.count(), 1)

    def test_start_subscription_requires_a_paid_invoice(self) -> None:
        with self.assertRaises(BillingError) as ctx:
            services.start_subscription(self.invoice)
        self.assertEqual(ctx.exception.code, "invoice_unpaid")

    def test_treatment_moves_to_awaiting_visit_completion(self) -> None:
        services.handle_payment_succeeded(self.pi)
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, Treatment.Status.AWAITING_VISIT_COMPLETION)

    def test_amount_mismatch_is_refused_and_leaves_invoice_open(self) -> None:
        with self.assertRaises(AmountMismatch):
            services.handle_payment_succeeded(self.pi, amount_received_cents=100)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "open")
        self.assertFalse(Subscription.objects.exists())

    def test_unknown_payment_intent_returns_none(self) -> None:
        self.assertIsNone(services.handle_payment_succeeded("pi_not_ours"))

    def test_first_card_becomes_default_only_when_none_set(self) -> None:
        services.handle_payment_succeeded(self.pi, payment_method_id="pm_first")
        customer = self.invoice.stripe_customer_id
        self.assertEqual(self.stripe.defaults[customer], "pm_first")
        self.stripe.defaults[customer] = "pm_chosen"
        other = services.create_checkout(self.patient, self.plan, consents=CONSENTS).invoice
        services.handle_payment_succeeded(other.stripe_payment_intent_id, payment_method_id="pm_second")
        self.assertEqual(self.stripe.defaults[customer], "pm_chosen")

    def test_monthly_subscription_dates(self) -> None:
        plan = make_plan(self.product, term=1, price_cents=29700)
        invoice = services.create_checkout(self.patient, plan, consents=CONSENTS).invoice
        paid = services.handle_payment_succeeded(invoice.stripe_payment_intent_id)
        sub = paid.subscription
        start = timezone.localdate()
        self.assertEqual(sub.term_starts_on, start)
        self.assertEqual(sub.next_bill_on, sub.term_ends_on)
        self.assertEqual(sub.batches_total, 1)
        self.assertTrue(sub.renews_at_term_end)

    def test_prepaid_without_auto_renew_consent_does_not_renew(self) -> None:
        invoice = services.create_checkout(self.patient, self.plan, consents=["no_cancel_after_submit"]).invoice
        sub = services.handle_payment_succeeded(invoice.stripe_payment_intent_id).subscription
        self.assertFalse(sub.renews_at_term_end)


class PaymentFailedTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=1)
        self.treatment = make_treatment(self.patient, self.product, self.plan)
        self.invoice = services.create_checkout(self.patient, self.plan, consents=CONSENTS, treatment=self.treatment).invoice
        self.pi = self.invoice.stripe_payment_intent_id

    def test_failure_marks_invoice_and_opens_action_item(self) -> None:
        services.handle_payment_failed(self.pi, failure_code="card_declined")
        self.invoice.refresh_from_db()
        self.assertEqual((self.invoice.status, self.invoice.failure_code), ("failed", "card_declined"))
        item = ActionItem.objects.get(patient=self.patient, kind="payment_failed")
        self.assertTrue(item.is_open)
        self.assertEqual(item.treatment_id, self.treatment.pk)
        self.mock_notify_patient.assert_called_once_with(self.patient, "payment_failed")

    def test_repeated_failure_events_do_not_duplicate_items_or_notifications(self) -> None:
        for _ in range(3):
            services.handle_payment_failed(self.pi, failure_code="card_declined")
        self.assertEqual(ActionItem.objects.filter(kind="payment_failed").count(), 1)
        self.mock_notify_patient.assert_called_once()

    def test_late_failure_does_not_undo_a_success(self) -> None:
        services.handle_payment_succeeded(self.pi)
        services.handle_payment_failed(self.pi, failure_code="late")
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "paid")
        self.assertFalse(ActionItem.objects.filter(kind="payment_failed").exists())

    def test_retry_after_failure_succeeds_and_closes_the_banner(self) -> None:
        services.handle_payment_failed(self.pi, failure_code="card_declined")
        services.handle_payment_succeeded(self.pi)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "paid")
        self.assertFalse(ActionItem.objects.get(kind="payment_failed").is_open)
        self.assertEqual(Subscription.objects.count(), 1)

    def test_unknown_intent_returns_none(self) -> None:
        self.assertIsNone(services.handle_payment_failed("pi_unknown"))

    def test_failed_renewal_marks_subscription_past_due(self) -> None:
        paid = services.handle_payment_succeeded(self.pi)
        sub = paid.subscription
        renewal = Invoice.objects.create(
            patient=self.patient, subscription=sub, treatment=self.treatment, status="open", total_cents=100,
            period_start=sub.term_ends_on, stripe_payment_intent_id="pi_renew",
        )
        services.handle_payment_failed("pi_renew", failure_code="insufficient_funds")
        sub.refresh_from_db()
        renewal.refresh_from_db()
        self.assertEqual((sub.status, renewal.status), ("past_due", "failed"))


class StripeSyncTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=3, price_cents=79100)
        self.invoice = services.create_checkout(self.patient, self.plan, consents=CONSENTS).invoice
        services.handle_payment_succeeded(self.invoice.stripe_payment_intent_id)

    def test_dashboard_refund_is_synced_once(self) -> None:
        pi = self.invoice.stripe_payment_intent_id
        services.handle_charge_refunded(pi, 5000)
        services.handle_charge_refunded(pi, 5000)
        invoice = Invoice.objects.get(pk=self.invoice.pk)
        self.assertEqual((invoice.refunded_cents, invoice.status), (5000, "partially_refunded"))
        self.assertEqual(invoice.refunds.count(), 1)

    def test_second_dashboard_refund_adds_only_the_difference(self) -> None:
        pi = self.invoice.stripe_payment_intent_id
        services.handle_charge_refunded(pi, 5000)
        services.handle_charge_refunded(pi, 79100)
        invoice = Invoice.objects.get(pk=self.invoice.pk)
        self.assertEqual((invoice.refunded_cents, invoice.status), (79100, "refunded"))

    def test_sync_never_exceeds_paid_amount(self) -> None:
        services.handle_charge_refunded(self.invoice.stripe_payment_intent_id, 10**9)
        self.assertEqual(Invoice.objects.get(pk=self.invoice.pk).refunded_cents, 79100)

    def test_dispute_flags_invoice_once(self) -> None:
        pi = self.invoice.stripe_payment_intent_id
        first = services.handle_dispute_created(pi).disputed_at
        self.assertIsNotNone(first)
        self.assertEqual(services.handle_dispute_created(pi).disputed_at, first)

    def test_dates_helper_clamps_month_ends(self) -> None:
        from apps.billing.dates import add_months

        self.assertEqual(add_months(date(2026, 1, 31), 1), date(2026, 2, 28))
        self.assertEqual(add_months(date(2028, 1, 31), 1), date(2028, 2, 29))
        self.assertEqual(add_months(date(2026, 11, 15), 3), date(2027, 2, 15))
        self.assertEqual(add_months(date(2026, 3, 1), 12), date(2027, 3, 1))

"""Refund guards: caps, idempotency, Stripe failure and retry, DB constraints."""
from __future__ import annotations

from django.db import IntegrityError, transaction

from apps.billing import services
from apps.billing.exceptions import RefundError, RefundExceedsPaid
from apps.billing.models import Invoice, Refund

from .factories import BillingTestCase, make_plan, paid_subscription


class RefundTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        _, self.invoice, self.treatment = paid_subscription(self, term=3, price_cents=79100)

    def test_partial_then_remaining_then_nothing_more(self) -> None:
        services.refund_invoice(self.invoice, 20000, "goodwill")
        services.refund_invoice(self.invoice, 59100, "billing_error")
        self.invoice.refresh_from_db()
        self.assertEqual((self.invoice.refunded_cents, self.invoice.status), (79100, "refunded"))
        with self.assertRaises(RefundExceedsPaid):
            services.refund_invoice(self.invoice, 1, "goodwill")

    def test_cannot_exceed_paid_amount(self) -> None:
        with self.assertRaises(RefundExceedsPaid):
            services.refund_invoice(self.invoice, 79101, "goodwill")
        self.assertFalse(Refund.objects.exists())
        self.assertEqual([c for c in self.stripe.calls if c[0] == "create_refund"], [])

    def test_cannot_exceed_in_two_steps(self) -> None:
        services.refund_invoice(self.invoice, 79000, "goodwill")
        with self.assertRaises(RefundExceedsPaid):
            services.refund_invoice(self.invoice, 101, "goodwill")

    def test_invalid_inputs(self) -> None:
        with self.assertRaises(RefundError):
            services.refund_invoice(self.invoice, 0, "goodwill")
        with self.assertRaises(RefundError):
            services.refund_invoice(self.invoice, -5, "goodwill")
        with self.assertRaises(RefundError):
            services.refund_invoice(self.invoice, 100, "because")

    def test_unpaid_invoice_cannot_be_refunded(self) -> None:
        plan = make_plan(self.product)
        open_invoice = services.create_checkout(
            self.patient, plan, consents=["no_cancel_after_submit"]
        ).invoice
        with self.assertRaises(RefundError) as ctx:
            services.refund_invoice(open_invoice, 100, "goodwill")
        self.assertEqual(ctx.exception.code, "invoice_not_paid")

    def test_same_scope_key_is_idempotent(self) -> None:
        a = services.refund_invoice(self.invoice, 1000, "goodwill", scope_key="ticket-1")
        b = services.refund_invoice(self.invoice, 1000, "goodwill", scope_key="ticket-1")
        self.assertEqual(a.pk, b.pk)
        self.assertEqual(len([c for c in self.stripe.calls if c[0] == "create_refund"]), 1)

    def test_stripe_ids_and_idempotency_key_recorded(self) -> None:
        refund = services.refund_invoice(self.invoice, 1000, "goodwill", scope_key="ticket-2")
        self.assertTrue(refund.stripe_refund_id)
        call = next(c[1] for c in self.stripe.calls if c[0] == "create_refund")
        self.assertEqual(call["idempotency_key"], f"refund-{self.invoice.pk}-ticket-2")
        self.assertEqual(set(call["metadata"]), {"beema_invoice_id", "beema_refund_id"})

    def test_stripe_failure_leaves_failed_row_and_retry_succeeds_once(self) -> None:
        self.stripe.fail_next = "create_refund"
        failed = services.refund_invoice(self.invoice, 5000, "goodwill", scope_key="t")
        self.assertEqual(failed.status, "failed")
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.refunded_cents, 0)  # a failed refund reserves nothing
        retried = services.retry_failed_refund(failed)
        self.assertEqual((retried.pk, retried.status), (failed.pk, "succeeded"))
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.refunded_cents, 5000)
        self.assertEqual(Refund.objects.count(), 1)

    def test_failed_refund_does_not_block_other_refunds_up_to_the_cap(self) -> None:
        self.stripe.fail_next = "create_refund"
        services.refund_invoice(self.invoice, 79100, "goodwill", scope_key="a")
        ok = services.refund_invoice(self.invoice, 79100, "goodwill", scope_key="b")
        self.assertEqual(ok.status, "succeeded")

    def test_db_constraint_blocks_refund_over_total(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            Invoice.objects.filter(pk=self.invoice.pk).update(refunded_cents=79101)

    def test_db_constraint_unique_scope_per_invoice(self) -> None:
        Refund.objects.create(invoice=self.invoice, amount_cents=1, reason="goodwill", scope_key="x")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Refund.objects.create(invoice=self.invoice, amount_cents=1, reason="goodwill", scope_key="x")

    def test_zero_amount_refund_row_is_impossible(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            Refund.objects.create(invoice=self.invoice, amount_cents=0, reason="goodwill")

    def test_refund_without_a_payment_intent_is_refused(self) -> None:
        Invoice.objects.filter(pk=self.invoice.pk).update(stripe_payment_intent_id="")
        with self.assertRaises(RefundError) as ctx:
            services.refund_invoice(self.invoice, 100, "goodwill")
        self.assertEqual(ctx.exception.code, "no_payment")

    def test_partial_refund_does_not_restore_store_credit(self) -> None:
        from apps.billing.models import StoreCreditEntry

        StoreCreditEntry.objects.create(patient=self.patient, delta_cents=3000, reason="goodwill")
        plan = make_plan(self.product, price_cents=10000)
        invoice = services.create_checkout(
            self.patient, plan, use_store_credit=True, consents=["no_cancel_after_submit"]
        ).invoice
        services.handle_payment_succeeded(invoice.stripe_payment_intent_id)
        services.refund_invoice(invoice, 1000, "goodwill")
        self.assertEqual(services.pricing.store_credit_balance(self.patient), 0)
        services.refund_invoice(invoice, 6000, "goodwill")
        self.assertEqual(services.pricing.store_credit_balance(self.patient), 3000)

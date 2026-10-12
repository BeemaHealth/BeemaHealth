"""The owner's cancellation policy, rules 1 to 7."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.billing import services
from apps.billing.exceptions import BillingError
from apps.billing.models import Invoice, Refund, Subscription, VendorCost
from apps.fulfillment.models import ShipmentBatch
from apps.patients.models import ConsentRecord

from .factories import BillingTestCase, make_org, paid_subscription


def refund_calls(case: BillingTestCase) -> list[dict]:
    return [c[1] for c in case.stripe.calls if c[0] == "create_refund"]


class Rule1NotSubmittedFullRefundTests(BillingTestCase):
    def test_monthly_cancel_before_submission_refunds_in_full(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=1, price_cents=29700)
        result = services.request_cancel(sub, self.patient.user)
        self.assertEqual((result.outcome, result.refunded_cents), ("refunded_before_submission", 29700))
        sub.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual((sub.status, sub.next_bill_on, sub.renews_at_term_end), ("canceled", None, False))
        self.assertEqual((invoice.status, invoice.refunded_cents), ("refunded", 29700))
        self.assertEqual(refund_calls(self)[0]["amount_cents"], 29700)

    def test_prepaid_cancel_before_submission_refunds_in_full(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=12, price_cents=278800)
        result = services.request_cancel(sub, self.patient.user)
        self.assertEqual((result.outcome, result.refunded_cents), ("refunded_before_submission", 278800))
        sub.refresh_from_db()
        self.assertEqual(sub.status, "canceled")

    def test_repeated_cancel_is_idempotent(self) -> None:
        sub, _, _ = paid_subscription(self, term=3)
        services.request_cancel(sub, self.patient.user)
        again = services.request_cancel(sub, self.patient.user)
        self.assertEqual(again.outcome, "already_ended")
        self.assertEqual(len(refund_calls(self)), 1)

    def test_discounted_invoice_refunds_what_was_paid_not_list_price(self) -> None:
        from .factories import make_coupon

        make_coupon("TEN", value=10000)
        sub, invoice, _ = paid_subscription(self, term=3, price_cents=79100, coupon_codes=["TEN"])
        result = services.request_cancel(sub, self.patient.user)
        self.assertEqual(result.refunded_cents, 69100)

    def test_store_credit_returns_to_the_patient_on_full_refund(self) -> None:
        from apps.billing.models import StoreCreditEntry

        StoreCreditEntry.objects.create(patient=self.patient, delta_cents=5000, reason="goodwill")
        from .factories import make_plan, make_treatment

        plan = make_plan(self.product, term=3, price_cents=79100)
        treatment = make_treatment(self.patient, self.product, plan)
        invoice = services.create_checkout(
            self.patient, plan, use_store_credit=True, consents=["no_cancel_after_submit"], treatment=treatment
        ).invoice
        invoice = services.handle_payment_succeeded(invoice.stripe_payment_intent_id)
        services.request_cancel(invoice.subscription, self.patient.user)
        self.assertEqual(services.pricing.store_credit_balance(self.patient), 5000)
        self.assertEqual(refund_calls(self)[0]["amount_cents"], 74100)  # card portion only


class Rule2SubmittedNoRefundTests(BillingTestCase):
    def test_monthly_after_submission_is_not_refunded(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=1, submitted=True)
        result = services.request_cancel(sub, self.patient.user)
        self.assertEqual(result.refunded_cents, 0)
        self.assertEqual(refund_calls(self), [])
        invoice.refresh_from_db()
        self.assertEqual(invoice.refunded_cents, 0)

    def test_prepaid_after_submission_is_not_refunded(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        services.request_cancel(sub, self.patient.user)
        self.assertEqual(refund_calls(self), [])
        self.assertFalse(Refund.objects.exists())

    def test_consent_to_no_cancel_exists_for_the_checkout(self) -> None:
        paid_subscription(self, term=3)
        self.assertTrue(ConsentRecord.objects.filter(patient=self.patient, kind="no_cancel_after_submit").exists())


class Rule3MonthlyTests(BillingTestCase):
    def test_cancel_stops_future_charges_but_keeps_paid_month(self) -> None:
        sub, _, _ = paid_subscription(self, term=1, submitted=True)
        result = services.request_cancel(sub, self.patient.user)
        sub.refresh_from_db()
        self.assertEqual(result.outcome, "cancel_at_period_end")
        self.assertEqual((sub.status, sub.cancel_requested, sub.next_bill_on), ("pending_cancel", True, None))
        self.assertEqual(sub.cancel_effective_on, sub.paid_through)
        self.assertFalse(sub.renews_at_term_end)

    def test_no_charge_on_renewal_date_after_cancel(self) -> None:
        sub, _, _ = paid_subscription(self, term=1, submitted=True)
        services.request_cancel(sub, self.patient.user)
        before = len(self.stripe.calls)
        report = services.run_renewals(sub.term_ends_on)
        self.assertEqual((report.charged, report.failed), ([], []))
        self.assertEqual(len(self.stripe.calls), before)

    def test_becomes_canceled_after_paid_period_ends(self) -> None:
        sub, _, _ = paid_subscription(self, term=1, submitted=True)
        services.request_cancel(sub, self.patient.user)
        services.run_renewals(sub.paid_through)  # last paid day: still pending
        sub.refresh_from_db()
        self.assertEqual(sub.status, "pending_cancel")
        report = services.run_renewals(sub.term_ends_on)
        sub.refresh_from_db()
        self.assertEqual((sub.status, report.canceled), ("canceled", [str(sub.pk)]))

    def test_cancel_after_a_renewal_has_no_refund(self) -> None:
        sub, _, treatment = paid_subscription(self, term=1, submitted=True)
        self.stripe.add_card(sub.stripe_customer_id)
        services.run_renewals(sub.next_bill_on)
        sub.refresh_from_db()
        self.assertEqual(sub.batches_total, 2)
        services.request_cancel(sub, self.patient.user)
        self.assertEqual(refund_calls(self), [])


class Rule4PrepaidTests(BillingTestCase):
    def test_cancel_only_turns_off_renewal(self) -> None:
        sub, _, _ = paid_subscription(self, term=12, submitted=True)
        self.assertTrue(sub.renews_at_term_end)
        result = services.request_cancel(sub, self.patient.user)
        sub.refresh_from_db()
        self.assertEqual(result.outcome, "auto_renew_off")
        self.assertEqual((sub.status, sub.renews_at_term_end, sub.cancel_requested), ("active", False, False))
        self.assertEqual(sub.batches_total, 4)
        self.assertEqual(refund_calls(self), [])

    def test_remaining_batches_still_ship_after_cancel(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        services.request_cancel(sub, self.patient.user)
        report = services.run_renewals(sub.term_ends_on + timedelta(days=30))
        sub.refresh_from_db()
        self.assertEqual(sub.status, "active")  # batches not shipped yet, so the term is not complete
        self.assertEqual(report.completed, [])

    def test_term_completes_once_all_batches_shipped(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        services.request_cancel(sub, self.patient.user)
        Subscription.objects.filter(pk=sub.pk).update(batches_shipped=2)
        report = services.run_renewals(sub.term_ends_on)
        sub.refresh_from_db()
        self.assertEqual((sub.status, report.completed), ("completed", [str(sub.pk)]))


class Rule5NotPrescribedTests(BillingTestCase):
    def test_full_refund_and_vendor_cost_is_kept(self) -> None:
        sub, invoice, treatment = paid_subscription(self, term=3, price_cents=79100, submitted=True)
        cost = VendorCost.objects.create(
            treatment=treatment, vendor=make_org(), kind="visit", amount_cents=3500, incurred_at=timezone.now(),
            invoice=invoice,
        )
        refunds = services.refund_not_prescribed(treatment)
        invoice.refresh_from_db()
        sub.refresh_from_db()
        self.assertEqual([r.amount_cents for r in refunds], [79100])
        self.assertEqual((invoice.status, invoice.refunded_cents), ("refunded", 79100))
        self.assertEqual(sub.status, "canceled")
        self.assertTrue(VendorCost.objects.filter(pk=cost.pk).exists())
        self.assertEqual(refunds[0].reason, "not_prescribed")

    def test_is_idempotent(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, submitted=True)
        services.refund_not_prescribed(treatment)
        services.refund_not_prescribed(treatment)
        self.assertEqual(Refund.objects.filter(invoice=invoice).count(), 1)
        self.assertEqual(len(refund_calls(self)), 1)

    def test_treatment_with_nothing_paid_is_a_no_op(self) -> None:
        from .factories import make_treatment

        treatment = make_treatment(self.patient, self.product)
        self.assertEqual(services.refund_not_prescribed(treatment), [])

    def test_partial_prior_refund_leaves_only_the_remainder(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        services.refund_invoice(invoice, 10000, "goodwill")
        refunds = services.refund_not_prescribed(treatment)
        self.assertEqual(refunds[0].amount_cents, 69100)
        invoice.refresh_from_db()
        self.assertEqual(invoice.refunded_cents, 79100)

    def test_canceled_before_submission_helper_uses_its_own_reason(self) -> None:
        _, _, treatment = paid_subscription(self, term=1)
        refunds = services.refund_canceled_before_submission(treatment)
        self.assertEqual(refunds[0].reason, "canceled_before_submission")


class Rule6UnshippedBatchTests(BillingTestCase):
    def make_batches(self, sub: Subscription, shipped: int) -> None:
        for n in range(1, sub.batches_total + 1):
            ShipmentBatch.objects.create(
                subscription=sub, sequence=n, due_on=timezone.localdate() + timedelta(days=90 * (n - 1)), supply_days=84,
                status="shipped" if n <= shipped else "scheduled",
            )

    def test_refunds_only_unshipped_share(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=12, price_cents=278800, submitted=True)
        self.make_batches(sub, shipped=1)
        refunds = services.refund_unshipped_batches(sub, "doctor_stopped")
        self.assertEqual(len(refunds), 3)
        self.assertEqual(sum(r.amount_cents for r in refunds), 278800 * 3 // 4)
        invoice.refresh_from_db()
        self.assertEqual((invoice.status, invoice.refunded_cents), ("partially_refunded", 209100))
        sub.refresh_from_db()
        self.assertEqual((sub.status, sub.renews_at_term_end), ("canceled", False))
        self.assertEqual(
            list(ShipmentBatch.objects.filter(subscription=sub).order_by("sequence").values_list("status", flat=True)),
            ["shipped", "refunded", "refunded", "refunded"],
        )

    def test_rounding_remainder_lands_on_the_last_batch_and_total_never_exceeds_paid(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=12, price_cents=100001, submitted=True)
        self.make_batches(sub, shipped=0)
        refunds = services.refund_unshipped_batches(sub, "unfillable")
        self.assertEqual(sorted(r.amount_cents for r in refunds), [25000, 25000, 25000, 25001])
        invoice.refresh_from_db()
        self.assertEqual(invoice.refunded_cents, 100001)

    def test_is_idempotent(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=6, price_cents=149700, submitted=True)
        self.make_batches(sub, shipped=0)
        services.refund_unshipped_batches(sub, "doctor_stopped")
        services.refund_unshipped_batches(sub, "doctor_stopped")
        self.assertEqual(Refund.objects.filter(invoice=invoice).count(), 2)
        self.assertEqual(len(refund_calls(self)), 2)

    def test_works_without_batch_rows_using_counters(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=6, price_cents=149700, submitted=True)
        Subscription.objects.filter(pk=sub.pk).update(batches_shipped=1)
        sub.refresh_from_db()
        refunds = services.refund_unshipped_batches(sub, "legal")
        self.assertEqual([r.amount_cents for r in refunds], [74850])

    def test_fully_shipped_term_refunds_nothing(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        self.make_batches(sub, shipped=2)
        self.assertEqual(services.refund_unshipped_batches(sub, "doctor_stopped"), [])

    def test_unknown_reason_rejected(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        with self.assertRaises(BillingError):
            services.refund_unshipped_batches(sub, "because")

    def test_monthly_unshipped_current_batch(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=1, price_cents=29700, submitted=True)
        refunds = services.refund_unshipped_batches(sub, "unfillable")
        self.assertEqual([r.amount_cents for r in refunds], [29700])

    def test_renewed_term_refunds_come_from_the_right_invoice(self) -> None:
        sub, first, _ = paid_subscription(self, term=3, price_cents=79100, submitted=True)
        self.stripe.add_card(sub.stripe_customer_id)
        services.run_renewals(sub.term_ends_on)
        sub.refresh_from_db()
        self.assertEqual(sub.batches_total, 2)
        Subscription.objects.filter(pk=sub.pk).update(batches_shipped=1)
        sub.refresh_from_db()
        refunds = services.refund_unshipped_batches(sub, "doctor_stopped")
        second = Invoice.objects.get(subscription=sub, period_start__isnull=False)
        self.assertEqual([(r.invoice_id, r.amount_cents) for r in refunds], [(second.pk, 79100)])
        first.refresh_from_db()
        self.assertEqual(first.refunded_cents, 0)


class Rule7AutoRenewTests(BillingTestCase):
    def test_prepaid_toggle_off_and_on(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        off = services.set_auto_renew(sub, False)
        self.assertFalse(off.renews_at_term_end)
        on = services.set_auto_renew(sub, True, ip="203.0.113.1", user_agent="UA")
        self.assertTrue(on.renews_at_term_end)
        self.assertEqual(ConsentRecord.objects.filter(patient=self.patient, kind="auto_renew").count(), 2)  # checkout and re-enable

    def test_toggle_is_idempotent_and_records_consent_once(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True, auto_renew=False)
        services.set_auto_renew(sub, True)
        services.set_auto_renew(sub, True)
        self.assertEqual(ConsentRecord.objects.filter(kind="auto_renew").count(), 1)

    def test_monthly_off_stops_billing_and_on_restores_it(self) -> None:
        sub, _, _ = paid_subscription(self, term=1, submitted=True)
        off = services.set_auto_renew(sub, False)
        self.assertEqual((off.status, off.next_bill_on), ("pending_cancel", None))
        on = services.set_auto_renew(sub, True)
        self.assertEqual((on.status, on.next_bill_on, on.cancel_requested), ("active", on.term_ends_on, False))

    def test_never_refunds(self) -> None:
        sub, _, _ = paid_subscription(self, term=1)  # not submitted
        services.set_auto_renew(sub, False)
        self.assertEqual(refund_calls(self), [])

    def test_ended_subscription_cannot_be_toggled(self) -> None:
        sub, _, _ = paid_subscription(self, term=1)
        services.request_cancel(sub, self.patient.user)
        with self.assertRaises(BillingError) as ctx:
            services.set_auto_renew(sub, True)
        self.assertEqual(ctx.exception.code, "subscription_ended")

    def test_cannot_resurrect_a_monthly_plan_after_its_paid_period(self) -> None:
        sub, _, _ = paid_subscription(self, term=1, submitted=True)
        services.set_auto_renew(sub, False)
        Subscription.objects.filter(pk=sub.pk).update(term_ends_on=timezone.localdate() - timedelta(days=1))
        sub.refresh_from_db()
        with self.assertRaises(BillingError):
            services.set_auto_renew(sub, True)

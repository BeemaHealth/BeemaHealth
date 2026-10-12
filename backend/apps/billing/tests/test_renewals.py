"""run_renewals: date boundaries, retries, idempotency, prepaid term renewal."""
from __future__ import annotations

from datetime import datetime, time, timedelta
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from apps.billing import services
from apps.billing.models import Invoice, Subscription
from apps.catalog.models import PriceOverride
from apps.clinical.models import ActionItem

from .factories import BillingTestCase, paid_subscription


class MonthlyRenewalTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.sub, self.first, self.treatment = paid_subscription(self, term=1, price_cents=29700, submitted=True)
        self.stripe.add_card(self.sub.stripe_customer_id)
        self.due = self.sub.next_bill_on

    def renewals(self) -> list[Invoice]:
        return list(Invoice.objects.filter(subscription=self.sub, period_start__isnull=False))

    def test_not_charged_the_day_before(self) -> None:
        report = services.run_renewals(self.due - timedelta(days=1))
        self.assertEqual((report.charged, self.renewals()), ([], []))

    def test_charged_exactly_on_the_due_date(self) -> None:
        report = services.run_renewals(self.due)
        self.assertEqual(report.charged, [str(self.sub.pk)])
        invoice = self.renewals()[0]
        self.assertEqual((invoice.status, invoice.total_cents, invoice.period_start), ("paid", 29700, self.due))
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.term_starts_on, self.due)
        self.assertEqual(self.sub.next_bill_on, self.sub.term_ends_on)
        self.assertGreater(self.sub.next_bill_on, self.due)
        self.assertEqual((self.sub.batches_total, self.sub.status), (2, "active"))
        self.mock_create_batches.assert_called()

    def test_running_twice_the_same_day_charges_once(self) -> None:
        services.run_renewals(self.due)
        report = services.run_renewals(self.due)
        self.assertEqual(report.charged, [])
        self.assertEqual(len(self.renewals()), 1)
        self.assertEqual(len([c for c in self.stripe.calls if c[0] == "create_payment_intent" and c[1]["off_session"]]), 1)

    def test_late_run_charges_once_per_run(self) -> None:
        services.run_renewals(self.due + timedelta(days=45))
        self.assertEqual(len(self.renewals()), 1)

    def test_stripe_call_is_off_session_neutral_and_idempotent_keyed(self) -> None:
        services.run_renewals(self.due)
        call = next(c[1] for c in self.stripe.calls if c[0] == "create_payment_intent" and c[1]["off_session"])
        self.assertEqual(call["payment_method_id"], "pm_fake1")
        self.assertTrue(call["idempotency_key"].startswith("charge-"))
        self.assertNotIn("slug", " ".join(call["metadata"]))
        self.assertTrue(call["description"].startswith("Beema Health"))

    def test_price_override_is_used_at_renewal(self) -> None:
        PriceOverride.objects.create(plan=self.sub.plan, patient=self.patient, amount_cents=19900, reason="loyalty")
        services.run_renewals(self.due)
        self.assertEqual(self.renewals()[0].total_cents, 19900)

    def test_declined_card_marks_past_due_and_opens_banner(self) -> None:
        self.stripe.off_session_outcome = "failed"
        report = services.run_renewals(self.due)
        self.assertEqual(report.failed, [str(self.sub.pk)])
        self.sub.refresh_from_db()
        invoice = self.renewals()[0]
        self.assertEqual((self.sub.status, invoice.status, invoice.attempt_count, invoice.failure_code), ("past_due", "failed", 1, "card_declined"))
        self.assertTrue(ActionItem.objects.filter(patient=self.patient, kind="payment_failed", is_open=True).exists())
        self.assertEqual(self.sub.next_bill_on, self.due)  # not advanced

    def test_missing_card_fails_without_calling_stripe_charge(self) -> None:
        self.stripe.defaults.clear()
        report = services.run_renewals(self.due)
        self.assertEqual(report.failed, [str(self.sub.pk)])
        self.assertEqual(self.renewals()[0].failure_code, "no_payment_method")
        self.assertFalse([c for c in self.stripe.calls if c[0] == "create_payment_intent" and c[1]["off_session"]])

    def at(self, day) -> "datetime":
        return datetime.combine(day, time(12, 0), tzinfo=timezone.get_current_timezone())

    def test_failed_period_retries_next_day_not_same_day(self) -> None:
        self.stripe.off_session_outcome = "failed"
        services.run_renewals(self.due)
        Invoice.objects.filter(subscription=self.sub, period_start=self.due).update(last_attempt_at=self.at(self.due))
        same_day = services.run_renewals(self.due)
        self.assertEqual((same_day.failed, same_day.skipped), ([], [str(self.sub.pk)]))
        self.stripe.off_session_outcome = "succeeded"
        report = services.run_renewals(self.due + timedelta(days=1))
        self.assertEqual(report.charged, [str(self.sub.pk)])
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.status, "active")
        self.assertEqual(len(self.renewals()), 1)  # same invoice reused
        self.assertEqual(self.renewals()[0].attempt_count, 2)
        self.assertFalse(ActionItem.objects.get(kind="payment_failed").is_open)

    def test_retries_stop_after_the_limit(self) -> None:
        self.stripe.off_session_outcome = "failed"
        for day in range(services.MAX_RENEWAL_ATTEMPTS + 2):
            Invoice.objects.filter(subscription=self.sub, period_start=self.due).update(
                last_attempt_at=self.at(self.due + timedelta(days=day - 1))
            )
            services.run_renewals(self.due + timedelta(days=day))
        self.assertEqual(self.renewals()[0].attempt_count, services.MAX_RENEWAL_ATTEMPTS)

    def test_stripe_outage_charges_nothing_and_changes_nothing(self) -> None:
        self.stripe.fail_next = "create_payment_intent"
        report = services.run_renewals(self.due)
        self.assertEqual((report.errors, report.charged), ([str(self.sub.pk)], []))
        self.assertEqual(self.renewals(), [])
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.next_bill_on, self.due)
        # The next run succeeds.
        self.assertEqual(services.run_renewals(self.due).charged, [str(self.sub.pk)])

    def test_cancel_requested_is_never_charged(self) -> None:
        services.request_cancel(self.sub, self.patient.user)
        self.assertEqual(services.run_renewals(self.due).charged, [])

    def test_ended_treatment_is_skipped(self) -> None:
        self.treatment.status = "ended"
        self.treatment.save()
        report = services.run_renewals(self.due)
        self.assertEqual((report.charged, report.skipped), ([], [str(self.sub.pk)]))

    def test_paid_invoice_with_unextended_subscription_is_repaired_not_recharged(self) -> None:
        services.run_renewals(self.due)
        # Simulate a crash after payment: the subscription is back at its pre-renewal state.
        Subscription.objects.filter(pk=self.sub.pk).update(
            term_starts_on=self.sub.term_starts_on, term_ends_on=self.due, next_bill_on=self.due, batches_total=1
        )
        charges = lambda: len([c for c in self.stripe.calls if c[0] == "create_payment_intent"])  # noqa: E731
        before = charges()
        services.run_renewals(self.due)
        self.assertEqual(charges(), before)
        self.assertEqual(len(self.renewals()), 1)
        self.sub.refresh_from_db()
        self.assertEqual((self.sub.batches_total, self.sub.term_starts_on), (2, self.due))
        self.assertGreater(self.sub.next_bill_on, self.due)

    def test_unique_period_invoice_constraint(self) -> None:
        from django.db import IntegrityError, transaction

        services.run_renewals(self.due)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Invoice.objects.create(patient=self.patient, subscription=self.sub, period_start=self.due, total_cents=1)

    def test_free_renewal_via_zero_price_override_needs_no_card(self) -> None:
        self.stripe.defaults.clear()
        PriceOverride.objects.create(plan=self.sub.plan, patient=self.patient, amount_cents=0, reason="comp")
        report = services.run_renewals(self.due)
        self.assertEqual(report.charged, [str(self.sub.pk)])
        self.assertEqual(self.renewals()[0].status, "paid")


class PrepaidRenewalTests(BillingTestCase):
    def test_prepaid_renews_at_term_end_when_enabled(self) -> None:
        sub, first, _ = paid_subscription(self, term=3, price_cents=79100, submitted=True, auto_renew=True)
        self.stripe.add_card(sub.stripe_customer_id)
        self.assertEqual(services.run_renewals(sub.term_ends_on - timedelta(days=1)).charged, [])
        end = sub.term_ends_on
        report = services.run_renewals(end)
        self.assertEqual(report.charged, [str(sub.pk)])
        sub.refresh_from_db()
        self.assertEqual((sub.term_starts_on, sub.batches_total, sub.status), (end, 2, "active"))
        self.assertIsNone(sub.next_bill_on)
        self.assertEqual(sub.paid_through, sub.term_ends_on - timedelta(days=1))
        self.assertEqual(services.run_renewals(end).charged, [])

    def test_prepaid_without_renewal_consent_is_not_charged(self) -> None:
        sub, _, _ = paid_subscription(self, term=3, submitted=True, auto_renew=False)
        self.stripe.add_card(sub.stripe_customer_id)
        self.assertEqual(services.run_renewals(sub.term_ends_on).charged, [])

    def test_prepaid_failed_renewal_goes_past_due(self) -> None:
        sub, _, _ = paid_subscription(self, term=6, submitted=True)
        self.stripe.add_card(sub.stripe_customer_id)
        self.stripe.off_session_outcome = "failed"
        services.run_renewals(sub.term_ends_on)
        sub.refresh_from_db()
        self.assertEqual(sub.status, "past_due")


class RenewalCommandTests(BillingTestCase):
    def test_command_runs_for_a_date_and_reports(self) -> None:
        sub, _, _ = paid_subscription(self, term=1, submitted=True)
        self.stripe.add_card(sub.stripe_customer_id)
        out = StringIO()
        call_command("run_renewals", "--date", sub.next_bill_on.isoformat(), stdout=out)
        self.assertIn("charged=1", out.getvalue())

    def test_command_rejects_a_bad_date(self) -> None:
        with self.assertRaises(CommandError):
            call_command("run_renewals", "--date", "10/06/2026")

    def test_command_defaults_to_today(self) -> None:
        out = StringIO()
        call_command("run_renewals", stdout=out)
        self.assertIn("charged=0", out.getvalue())

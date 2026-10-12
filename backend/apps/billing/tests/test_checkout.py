"""create_checkout: consents, Stripe payloads, coupon and credit reservation, races."""
from __future__ import annotations

from apps.billing import services
from apps.billing.exceptions import CheckoutError, CouponRejected, StripeUnavailable
from apps.billing.models import CouponRedemption, Invoice, StoreCreditEntry, Subscription
from apps.patients.models import ConsentRecord

from .factories import BillingTestCase, make_coupon, make_plan, make_profile, make_treatment

CONSENTS = ["no_cancel_after_submit", "auto_renew"]


class CreateCheckoutTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=3, price_cents=79100)

    def checkout(self, **kwargs):
        kwargs.setdefault("consents", CONSENTS)
        return services.create_checkout(self.patient, self.plan, **kwargs)

    def test_creates_invoice_line_and_payment_intent(self) -> None:
        result = self.checkout()
        invoice = result.invoice
        self.assertEqual((invoice.status, invoice.total_cents, invoice.subtotal_cents), ("open", 79100, 79100))
        self.assertEqual(invoice.lines.count(), 1)
        self.assertTrue(result.client_secret)
        self.assertTrue(invoice.stripe_payment_intent_id)
        self.assertEqual(self.stripe.payment_intents[invoice.stripe_payment_intent_id]["amount"], 79100)
        self.assertTrue(result.requires_payment)

    def test_consents_are_recorded(self) -> None:
        self.checkout(ip="203.0.113.9", user_agent="UA")
        kinds = set(ConsentRecord.objects.filter(patient=self.patient).values_list("kind", flat=True))
        self.assertEqual(kinds, {"no_cancel_after_submit", "auto_renew"})
        record = ConsentRecord.objects.get(patient=self.patient, kind="no_cancel_after_submit")
        self.assertEqual(record.ip, "203.0.113.9")
        self.assertEqual(len(record.user_agent_hash), 64)
        self.assertNotIn("UA", record.user_agent_hash)

    def test_no_cancel_acknowledgment_is_required(self) -> None:
        with self.assertRaises(CheckoutError) as ctx:
            self.checkout(consents=["auto_renew"])
        self.assertEqual(ctx.exception.code, "consent_required")
        self.assertEqual(Invoice.objects.count(), 0)
        self.assertEqual(ConsentRecord.objects.count(), 0)

    def test_unknown_consent_kind_rejected(self) -> None:
        with self.assertRaises(CheckoutError):
            self.checkout(consents=["no_cancel_after_submit", "terms"])

    def test_auto_renew_consent_is_remembered_on_invoice(self) -> None:
        self.assertTrue(self.checkout().invoice.auto_renew_consented)
        self.assertFalse(self.checkout(consents=["no_cancel_after_submit"]).invoice.auto_renew_consented)

    def test_stripe_payload_is_neutral(self) -> None:
        self.product.neutral_label = "Beema Health membership"
        self.product.save()
        self.checkout(coupon_codes=[])
        _, call = next(c for c in self.stripe.calls if c[0] == "create_payment_intent")
        blob = " ".join([call["description"], *call["metadata"].keys(), *call["metadata"].values()]).lower()
        for banned in ("semaglutide", "tirzepatide", "glp", "weight", "obesity", self.plan.slug, self.product.slug):
            self.assertNotIn(banned, blob)
        self.assertEqual(set(call["metadata"]), {"beema_invoice_id", "beema_patient_id"})
        self.assertTrue(call["idempotency_key"].startswith("checkout-"))

    def test_customer_is_created_once_and_reused(self) -> None:
        first = self.checkout().invoice
        second = self.checkout().invoice
        self.assertEqual(first.stripe_customer_id, second.stripe_customer_id)
        self.assertEqual(len(self.stripe.customers), 1)

    def test_inactive_plan_rejected(self) -> None:
        self.plan.is_active = False
        self.plan.save()
        with self.assertRaises(CheckoutError):
            self.checkout()

    def test_treatment_of_another_patient_rejected(self) -> None:
        other = make_treatment(make_profile(), self.product)
        with self.assertRaises(CheckoutError) as ctx:
            self.checkout(treatment=other)
        self.assertEqual(ctx.exception.code, "treatment_mismatch")

    def test_stripe_outage_rolls_everything_back(self) -> None:
        make_coupon("TEN", kind="percent", value=10)
        self.stripe.fail_next = "create_payment_intent"
        with self.assertRaises(StripeUnavailable):
            self.checkout(coupon_codes=["TEN"])
        self.assertEqual(Invoice.objects.count(), 0)
        self.assertEqual(CouponRedemption.objects.count(), 0)
        self.assertEqual(ConsentRecord.objects.count(), 0)

    def test_rejected_coupon_blocks_checkout_with_reasons(self) -> None:
        with self.assertRaises(CouponRejected) as ctx:
            self.checkout(coupon_codes=["NOPE"])
        self.assertEqual(ctx.exception.quote.rejected_coupons[0].reason, "unknown_code")
        self.assertEqual(Invoice.objects.count(), 0)

    def test_total_below_stripe_minimum_is_refused(self) -> None:
        make_coupon("ALMOST", value=79100 - 30)
        with self.assertRaises(CheckoutError) as ctx:
            self.checkout(coupon_codes=["ALMOST"])
        self.assertEqual(ctx.exception.code, "below_minimum_charge")

    def test_coupon_is_reserved_at_checkout(self) -> None:
        make_coupon("Tirz100", value=10000, per_patient_cap=1, eligible_term_months=[3, 6, 12])
        invoice = self.checkout(coupon_codes=["tirz100"]).invoice
        self.assertEqual(invoice.total_cents, 69100)
        self.assertEqual(invoice.discount_cents, 10000)
        redemption = CouponRedemption.objects.get()
        self.assertEqual((redemption.invoice_id, redemption.amount_cents), (invoice.pk, 10000))

    def test_once_per_patient_coupon_cannot_be_used_twice_even_in_parallel_checkouts(self) -> None:
        make_coupon("ONCE", value=10000, per_patient_cap=1)
        first = self.checkout(coupon_codes=["ONCE"], treatment=make_treatment(self.patient, self.product))
        self.assertEqual(first.invoice.discount_cents, 10000)
        # A second, different checkout (another treatment) while the first is still unpaid.
        with self.assertRaises(CouponRejected) as ctx:
            self.checkout(coupon_codes=["ONCE"], treatment=make_treatment(self.patient, self.product))
        self.assertEqual(ctx.exception.quote.rejected_coupons[0].reason, "per_patient_cap_reached")

    def test_global_cap_race_second_patient_loses(self) -> None:
        make_coupon("LAST", value=5000, global_cap=1)
        services.create_checkout(self.patient, self.plan, ["LAST"], consents=CONSENTS)
        with self.assertRaises(CouponRejected) as ctx:
            services.create_checkout(make_profile(), self.plan, ["LAST"], consents=CONSENTS)
        self.assertEqual(ctx.exception.quote.rejected_coupons[0].reason, "global_cap_reached")
        self.assertEqual(CouponRedemption.objects.filter(released_at__isnull=True).count(), 1)

    def test_coupon_locking_is_requested(self) -> None:
        """The cap check runs under select_for_update on the coupon row (a real DB serialises on it)."""
        from unittest import mock

        from apps.billing.models import Coupon

        make_coupon("LOCKME", value=100)
        with mock.patch.object(Coupon.objects.__class__, "select_for_update", autospec=True,
                               side_effect=Coupon.objects.__class__.select_for_update) as locked:
            self.checkout(coupon_codes=["LOCKME"])
        self.assertTrue(locked.called)

    def test_redemption_is_unique_per_coupon_and_invoice(self) -> None:
        from django.db import IntegrityError, transaction

        coupon = make_coupon("UNI", value=100)
        invoice = self.checkout().invoice
        CouponRedemption.objects.create(coupon=coupon, patient=self.patient, invoice=invoice, amount_cents=100)
        with self.assertRaises(IntegrityError), transaction.atomic():
            CouponRedemption.objects.create(coupon=coupon, patient=self.patient, invoice=invoice, amount_cents=100)

    def test_restarting_checkout_voids_the_stale_invoice_and_frees_the_coupon(self) -> None:
        make_coupon("ONCE", value=10000, per_patient_cap=1)
        first = self.checkout(coupon_codes=["ONCE"]).invoice
        second = self.checkout(coupon_codes=["ONCE"]).invoice
        first.refresh_from_db()
        self.assertEqual(first.status, "void")
        self.assertEqual(second.discount_cents, 10000)
        self.assertEqual(CouponRedemption.objects.filter(released_at__isnull=True).count(), 1)
        self.assertEqual(self.stripe.payment_intents[first.stripe_payment_intent_id]["status"], "canceled")

    def test_store_credit_is_debited_and_returned_on_void(self) -> None:
        StoreCreditEntry.objects.create(patient=self.patient, delta_cents=5000, reason="goodwill")
        invoice = self.checkout(use_store_credit=True).invoice
        self.assertEqual((invoice.credit_cents, invoice.total_cents), (5000, 74100))
        self.assertEqual(services.pricing.store_credit_balance(self.patient), 0)
        services.void_invoice(invoice)
        self.assertEqual(services.pricing.store_credit_balance(self.patient), 5000)
        services.void_invoice(invoice)  # idempotent
        self.assertEqual(services.pricing.store_credit_balance(self.patient), 5000)

    def test_free_checkout_skips_stripe_and_starts_subscription(self) -> None:
        make_coupon("FREE", kind="percent", value=100)
        result = self.checkout(coupon_codes=["FREE"])
        self.assertFalse(result.requires_payment)
        self.assertEqual(result.invoice.status, "paid")
        self.assertEqual(result.invoice.stripe_payment_intent_id, "")
        self.assertEqual(Subscription.objects.filter(patient=self.patient).count(), 1)
        self.assertFalse([c for c in self.stripe.calls if c[0] == "create_payment_intent"])

    def test_checkout_with_treatment_links_it(self) -> None:
        treatment = make_treatment(self.patient, self.product, self.plan)
        self.assertEqual(self.checkout(treatment=treatment).invoice.treatment_id, treatment.pk)

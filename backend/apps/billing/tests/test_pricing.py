"""Quote engine: base price, overrides, coupon matrix, stacking, caps, rounding, store credit."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.billing import pricing
from apps.billing.models import CouponRedemption, Invoice, StoreCreditEntry
from apps.catalog.models import PriceOverride

from .factories import BillingTestCase, make_coupon, make_paid_invoice, make_plan, make_profile, make_product


class BasePriceTests(BillingTestCase):
    def test_plain_quote_has_no_discount(self) -> None:
        plan = make_plan(self.product, term=3, price_cents=79100)
        q = pricing.quote(self.patient, plan)
        self.assertEqual((q.base_price_cents, q.subtotal_cents, q.discount_cents, q.total_cents), (79100, 79100, 0, 79100))
        self.assertEqual(q.rejected_coupons, ())

    def test_missing_price_raises_pricing_error(self) -> None:
        plan = make_plan(self.product)
        plan.prices.all().delete()
        with self.assertRaises(pricing.PricingError):
            pricing.quote(self.patient, plan)

    def test_quote_writes_nothing(self) -> None:
        plan = make_plan(self.product, term=3)
        make_coupon("SAVE", value=1000)
        pricing.quote(self.patient, plan, ["SAVE"], True)
        self.assertEqual(CouponRedemption.objects.count(), 0)
        self.assertEqual(Invoice.objects.count(), 0)


class OverrideTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=3, price_cents=79100)

    def test_patient_override_replaces_base_price(self) -> None:
        PriceOverride.objects.create(plan=self.plan, patient=self.patient, amount_cents=50000, reason="vip")
        q = pricing.quote(self.patient, self.plan)
        self.assertEqual((q.base_price_cents, q.price_override_cents, q.subtotal_cents), (79100, 50000, 50000))

    def test_patient_override_beats_global_override(self) -> None:
        PriceOverride.objects.create(plan=self.plan, patient=None, amount_cents=60000, reason="sale")
        PriceOverride.objects.create(plan=self.plan, patient=self.patient, amount_cents=55000, reason="vip")
        self.assertEqual(pricing.quote(self.patient, self.plan).subtotal_cents, 55000)

    def test_global_override_applies_to_everyone_else(self) -> None:
        PriceOverride.objects.create(plan=self.plan, patient=None, amount_cents=60000, reason="sale")
        other = make_profile()
        self.assertEqual(pricing.quote(other, self.plan).subtotal_cents, 60000)

    def test_other_patients_override_is_ignored(self) -> None:
        other = make_profile()
        PriceOverride.objects.create(plan=self.plan, patient=other, amount_cents=100, reason="vip")
        self.assertEqual(pricing.quote(self.patient, self.plan).subtotal_cents, 79100)

    def test_expired_and_inactive_overrides_ignored(self) -> None:
        PriceOverride.objects.create(
            plan=self.plan, patient=self.patient, amount_cents=100, reason="old",
            expires_at=timezone.now() - timedelta(hours=1),
        )
        PriceOverride.objects.create(plan=self.plan, patient=self.patient, amount_cents=200, reason="off", is_active=False)
        self.assertEqual(pricing.quote(self.patient, self.plan).subtotal_cents, 79100)

    def test_coupon_applies_on_top_of_override(self) -> None:
        PriceOverride.objects.create(plan=self.plan, patient=self.patient, amount_cents=50000, reason="vip")
        make_coupon("TEN", kind="percent", value=10)
        self.assertEqual(pricing.quote(self.patient, self.plan, ["TEN"]).total_cents, 45000)


class MarketingRuleTests(BillingTestCase):
    """The real rule: $100 off, one time per patient, 3/6/12 month plans only, never 1 month or starter."""

    def setUp(self) -> None:
        super().setUp()
        self.coupon = make_coupon(
            "Tirz100", value=10000, per_patient_cap=1, eligible_term_months=[3, 6, 12], excludes_starter_pack=True
        )

    def test_applies_to_3_6_12_month_plans(self) -> None:
        for term, price in ((3, 79100), (6, 149700), (12, 278800)):
            plan = make_plan(self.product, term=term, price_cents=price)
            q = pricing.quote(self.patient, plan, ["tirz100"])
            self.assertEqual(q.discount_cents, 10000, term)
            self.assertEqual(q.total_cents, price - 10000, term)

    def test_never_applies_to_one_month(self) -> None:
        q = pricing.quote(self.patient, make_plan(self.product, term=1), ["Tirz100"])
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.TERM_NOT_ELIGIBLE])
        self.assertEqual(q.discount_cents, 0)

    def test_never_applies_to_starter_pack(self) -> None:
        starter = make_plan(self.product, term=3, price_cents=59700, kind="starter_pack", stackable_with_term_discount=False)
        q = pricing.quote(self.patient, starter, ["Tirz100"])
        self.assertEqual(len(q.rejected_coupons), 1)
        self.assertEqual(q.discount_cents, 0)

    def test_starter_rejected_for_the_coupon_flag_even_when_plan_allows_stacking(self) -> None:
        starter = make_plan(self.product, term=3, price_cents=59700, kind="starter_pack")
        q = pricing.quote(self.patient, starter, ["Tirz100"])
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.STARTER_PACK_EXCLUDED])

    def test_second_use_by_same_patient_is_rejected(self) -> None:
        plan = make_plan(self.product, term=3)
        invoice = make_paid_invoice(self.patient, plan)
        CouponRedemption.objects.create(coupon=self.coupon, patient=self.patient, invoice=invoice, amount_cents=10000)
        q = pricing.quote(self.patient, plan, ["Tirz100"])
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.PER_PATIENT_CAP_REACHED])

    def test_other_patient_can_still_use_it(self) -> None:
        plan = make_plan(self.product, term=3)
        invoice = make_paid_invoice(self.patient, plan)
        CouponRedemption.objects.create(coupon=self.coupon, patient=self.patient, invoice=invoice, amount_cents=10000)
        self.assertEqual(pricing.quote(make_profile(), plan, ["Tirz100"]).discount_cents, 10000)

    def test_released_redemption_frees_the_slot(self) -> None:
        plan = make_plan(self.product, term=3)
        invoice = make_paid_invoice(self.patient, plan)
        CouponRedemption.objects.create(
            coupon=self.coupon, patient=self.patient, invoice=invoice, amount_cents=10000, released_at=timezone.now()
        )
        self.assertEqual(pricing.quote(self.patient, plan, ["Tirz100"]).discount_cents, 10000)


class CouponRuleTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=3, price_cents=79100)

    def reasons(self, *codes: str, plan=None, patient=None) -> list[str]:
        q = pricing.quote(patient or self.patient, plan or self.plan, list(codes))
        return [r.reason for r in q.rejected_coupons]

    def test_unknown_code(self) -> None:
        self.assertEqual(self.reasons("NOPE"), [pricing.UNKNOWN_CODE])

    def test_code_lookup_is_case_insensitive_and_trims(self) -> None:
        make_coupon("Summer", value=500)
        q = pricing.quote(self.patient, self.plan, ["  SUMMER "])
        self.assertEqual(q.discount_cents, 500)

    def test_inactive(self) -> None:
        make_coupon("OFF", is_active=False)
        self.assertEqual(self.reasons("OFF"), [pricing.INACTIVE])

    def test_not_started_and_expired(self) -> None:
        make_coupon("LATER", starts_at=timezone.now() + timedelta(days=1))
        make_coupon("GONE", ends_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.reasons("LATER"), [pricing.NOT_STARTED])
        self.assertEqual(self.reasons("GONE"), [pricing.EXPIRED])

    def test_expiry_boundary_is_exclusive(self) -> None:
        end = timezone.now()
        make_coupon("EDGE", ends_at=end)
        q = pricing.quote(self.patient, self.plan, ["EDGE"], at=end - timedelta(microseconds=1))
        self.assertEqual(q.rejected_coupons, ())
        q = pricing.quote(self.patient, self.plan, ["EDGE"], at=end)
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.EXPIRED])

    def test_patient_allowlist(self) -> None:
        make_coupon("VIP", patients=[self.patient])
        self.assertEqual(self.reasons("VIP"), [])
        self.assertEqual(self.reasons("VIP", patient=make_profile()), [pricing.PATIENT_NOT_ALLOWED])

    def test_per_product(self) -> None:
        make_coupon("ONLYHERE", products=[self.product])
        other_plan = make_plan(make_product())
        self.assertEqual(self.reasons("ONLYHERE"), [])
        self.assertEqual(self.reasons("ONLYHERE", plan=other_plan), [pricing.PRODUCT_NOT_ELIGIBLE])

    def test_first_order_only(self) -> None:
        make_coupon("FIRST", first_order_only=True)
        self.assertEqual(self.reasons("FIRST"), [])
        make_paid_invoice(self.patient, self.plan)
        self.assertEqual(self.reasons("FIRST"), [pricing.FIRST_ORDER_ONLY])

    def test_unpaid_invoice_does_not_count_as_a_prior_order(self) -> None:
        make_coupon("FIRST", first_order_only=True)
        Invoice.objects.create(patient=self.patient, status="open", total_cents=100)
        self.assertEqual(self.reasons("FIRST"), [])

    def test_global_cap(self) -> None:
        coupon = make_coupon("ONCE", global_cap=1)
        invoice = make_paid_invoice(make_profile(), self.plan)
        CouponRedemption.objects.create(coupon=coupon, patient=invoice.patient, invoice=invoice, amount_cents=1)
        self.assertEqual(self.reasons("ONCE"), [pricing.GLOBAL_CAP_REACHED])

    def test_plan_that_disallows_coupons(self) -> None:
        make_coupon("ANY")
        plan = make_plan(self.product, allows_coupons=False)
        self.assertEqual(self.reasons("ANY", plan=plan), [pricing.PLAN_EXCLUDES_COUPONS])

    def test_plan_not_stackable_with_its_term_discount(self) -> None:
        make_coupon("ANY")
        plan = make_plan(self.product, term=6, stackable_with_term_discount=False)
        self.assertEqual(self.reasons("ANY", plan=plan), [pricing.NO_STACK_WITH_TERM_DISCOUNT])

    def test_one_month_plan_ignores_term_discount_flag(self) -> None:
        make_coupon("ANY", value=100)
        plan = make_plan(self.product, term=1, stackable_with_term_discount=False)
        self.assertEqual(self.reasons("ANY", plan=plan), [])

    def test_duplicate_codes_apply_once(self) -> None:
        make_coupon("DUP", value=1000, stackable=True)
        q = pricing.quote(self.patient, self.plan, ["dup", "DUP"])
        self.assertEqual((q.discount_cents, len(q.applied_coupons), q.rejected_coupons), (1000, 1, ()))

    def test_rejection_has_a_human_message(self) -> None:
        q = pricing.quote(self.patient, self.plan, ["NOPE"])
        self.assertTrue(q.rejected_coupons[0].message)

    def test_sql_injection_style_code_is_just_unknown(self) -> None:
        q = pricing.quote(self.patient, self.plan, ["' OR 1=1 --", "%", "A" * 5000])
        self.assertEqual({r.reason for r in q.rejected_coupons}, {pricing.UNKNOWN_CODE})
        self.assertEqual(q.discount_cents, 0)


class StackingAndMathTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=3, price_cents=79100)

    def test_percent_applies_before_fixed_regardless_of_stack_order(self) -> None:
        make_coupon("FIXED", kind="fixed", value=10000, stackable=True, stack_order=1)
        make_coupon("PCT", kind="percent", value=10, stackable=True, stack_order=99)
        q = pricing.quote(self.patient, self.plan, ["FIXED", "PCT"])
        # 79100 -> 10% = 7910 -> 71190 -> minus 10000 = 61190. Fixed first would give 62190.
        self.assertEqual(q.total_cents, 61190)
        self.assertEqual([a.code for a in q.applied_coupons], ["PCT", "FIXED"])

    def test_stack_order_breaks_ties_within_kind(self) -> None:
        make_coupon("P20", kind="percent", value=20, stackable=True, stack_order=2)
        make_coupon("P10", kind="percent", value=10, stackable=True, stack_order=1)
        q = pricing.quote(self.patient, self.plan, ["P20", "P10"])
        self.assertEqual([a.code for a in q.applied_coupons], ["P10", "P20"])
        self.assertEqual(q.total_cents, 79100 - 7910 - 14238)  # second percent is of the reduced amount

    def test_non_stackable_blocks_the_rest(self) -> None:
        make_coupon("SOLO", kind="percent", value=10, stackable=False)
        make_coupon("EXTRA", kind="fixed", value=500, stackable=True)
        q = pricing.quote(self.patient, self.plan, ["SOLO", "EXTRA"])
        self.assertEqual([a.code for a in q.applied_coupons], ["SOLO"])
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.NOT_STACKABLE])

    def test_stackable_coupon_cannot_join_a_non_stackable_one_that_sorts_later(self) -> None:
        make_coupon("S", kind="percent", value=10, stackable=True)
        make_coupon("N", kind="fixed", value=500, stackable=False)
        q = pricing.quote(self.patient, self.plan, ["S", "N"])
        self.assertEqual([a.code for a in q.applied_coupons], ["S"])
        self.assertEqual([r.code for r in q.rejected_coupons], ["N"])

    def test_percent_rounds_half_up_to_the_cent(self) -> None:
        plan = make_plan(self.product, price_cents=1005)
        make_coupon("HALF", kind="percent", value=50)
        q = pricing.quote(self.patient, plan, ["HALF"])
        self.assertEqual(q.discount_cents, 503)  # 502.5 rounds up
        self.assertEqual(q.total_cents, 502)

    def test_percent_never_produces_fractions_of_a_cent(self) -> None:
        plan = make_plan(self.product, price_cents=19999)
        make_coupon("THIRD", kind="percent", value=33)
        q = pricing.quote(self.patient, plan, ["THIRD"])
        self.assertIsInstance(q.total_cents, int)
        self.assertEqual(q.discount_cents, 6600)  # 6599.67 -> 6600

    def test_floor_at_zero_for_oversized_fixed_coupon(self) -> None:
        make_coupon("HUGE", value=10_000_000)
        q = pricing.quote(self.patient, self.plan, ["HUGE"])
        self.assertEqual((q.total_cents, q.discount_cents), (0, 79100))

    def test_hundred_percent_coupon_is_free(self) -> None:
        make_coupon("FREE", kind="percent", value=100)
        self.assertEqual(pricing.quote(self.patient, self.plan, ["FREE"]).total_cents, 0)

    def test_second_coupon_after_zero_is_rejected_as_nothing_to_discount(self) -> None:
        make_coupon("FREE", kind="percent", value=100, stackable=True)
        make_coupon("MORE", kind="fixed", value=100, stackable=True)
        q = pricing.quote(self.patient, self.plan, ["FREE", "MORE"])
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.NOTHING_TO_DISCOUNT])

    def test_applied_amounts_sum_to_discount(self) -> None:
        make_coupon("A", kind="percent", value=15, stackable=True)
        make_coupon("B", kind="fixed", value=2500, stackable=True)
        q = pricing.quote(self.patient, self.plan, ["A", "B"])
        self.assertEqual(sum(a.amount_cents for a in q.applied_coupons), q.discount_cents)
        self.assertEqual(q.subtotal_cents - q.discount_cents - q.credit_cents, q.total_cents)


class StoreCreditTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=1, price_cents=10000)

    def give(self, cents: int) -> None:
        StoreCreditEntry.objects.create(patient=self.patient, delta_cents=cents, reason="goodwill")

    def test_credit_not_used_unless_requested(self) -> None:
        self.give(5000)
        q = pricing.quote(self.patient, self.plan)
        self.assertEqual((q.credit_cents, q.total_cents, q.store_credit_balance_cents), (0, 10000, 5000))

    def test_partial_credit(self) -> None:
        self.give(5000)
        q = pricing.quote(self.patient, self.plan, use_store_credit=True)
        self.assertEqual((q.credit_cents, q.total_cents), (5000, 5000))

    def test_credit_applies_after_coupons(self) -> None:
        self.give(5000)
        make_coupon("TEN", kind="percent", value=10)
        q = pricing.quote(self.patient, self.plan, ["TEN"], use_store_credit=True)
        self.assertEqual((q.subtotal_cents, q.discount_cents, q.credit_cents, q.total_cents), (10000, 1000, 5000, 4000))

    def test_card_is_always_charged_the_minimum(self) -> None:
        self.give(50000)
        q = pricing.quote(self.patient, self.plan, use_store_credit=True)
        self.assertEqual((q.credit_cents, q.total_cents), (9900, 100))

    def test_bask_example_gap_under_a_dollar(self) -> None:
        plan = make_plan(self.product, price_cents=10040)
        self.give(9950)
        q = pricing.quote(self.patient, plan, use_store_credit=True)
        self.assertEqual((q.credit_cents, q.total_cents), (9940, 100))

    def test_no_credit_when_coupon_already_made_it_free(self) -> None:
        self.give(5000)
        make_coupon("FREE", kind="percent", value=100)
        q = pricing.quote(self.patient, self.plan, ["FREE"], use_store_credit=True)
        self.assertEqual((q.credit_cents, q.total_cents), (0, 0))

    def test_negative_balance_never_increases_the_total(self) -> None:
        self.give(-500)
        q = pricing.quote(self.patient, self.plan, use_store_credit=True)
        self.assertEqual((q.credit_cents, q.total_cents), (0, 10000))


class QuoteAmountTests(BillingTestCase):
    def test_one_time_amount_with_coupon(self) -> None:
        make_coupon("TEN", kind="percent", value=10)
        q = pricing.quote_amount(self.patient, 5000, product=self.product, coupon_codes=["TEN"])
        self.assertEqual(q.total_cents, 4500)

    def test_term_restricted_coupon_does_not_match_one_time(self) -> None:
        make_coupon("TERMS", eligible_term_months=[3, 6, 12])
        q = pricing.quote_amount(self.patient, 5000, coupon_codes=["TERMS"])
        self.assertEqual([r.reason for r in q.rejected_coupons], [pricing.TERM_NOT_ELIGIBLE])

    def test_negative_amount_rejected(self) -> None:
        with self.assertRaises(pricing.PricingError):
            pricing.quote_amount(self.patient, -1)

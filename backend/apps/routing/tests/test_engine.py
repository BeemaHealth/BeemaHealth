from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.test import TestCase
from django.utils import timezone

from apps.accounts.tests.helpers import make_org, make_staff
from apps.clinical.models import Treatment
from apps.clinical.tests.helpers import (
    StubbedHooksMixin, make_address, make_plan, make_product, make_profile, make_treatment, make_variant,
)
from apps.routing import engine
from apps.routing.models import ReplacementRule, RoutingDecision, RoutingRule

S = Treatment.Status
Result = RoutingDecision.Result


class RoutingBase(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()
        make_address(self.profile, "TX")
        self.product = make_product("weight-loss-glp1")
        self.variant = make_variant(self.product, "5.00")
        self.plan = make_plan(self.product, self.variant, term=3)
        self.network = make_org("beluga", "network")
        self.network2 = make_org("other-net", "network")
        self.pharmacy = make_org("pharm-a", "pharmacy")
        self.pharmacy2 = make_org("pharm-b", "pharmacy")

    def rule(self, name="r", network=None, **extra) -> RoutingRule:
        extra.setdefault("product", self.product)
        return RoutingRule.objects.create(name=name, network=network or self.network, **extra)

    def treatment(self, status=S.AWAITING_VISIT_COMPLETION, profile=None, **extra) -> Treatment:
        extra.setdefault("requested_strength_mg", Decimal("5.00"))
        extra.setdefault("variant", self.variant)
        return make_treatment(profile or self.profile, status, product=self.product, plan=self.plan, **extra)


class PrecedenceTests(RoutingBase):
    def test_only_beats_except_beats_all(self):
        self.rule("all", self.network2, states_mode="all")
        self.rule("except", self.network2, states_mode="except", states=["CA"])
        self.rule("only", self.network, states_mode="only", states=["tx"])
        d = engine.route(self.treatment())
        self.assertEqual((d.result, d.rule.name), (Result.ROUTED, "only"))
        self.assertEqual(d.treatment.network, self.network)

    def test_except_beats_all(self):
        self.rule("all", self.network2, states_mode="all")
        self.rule("except", self.network, states_mode="except", states=["CA"])
        self.assertEqual(engine.route(self.treatment()).rule.name, "except")

    def test_state_specificity_beats_priority_number(self):
        self.rule("all-first", self.network2, states_mode="all", priority=1)
        self.rule("only-late", self.network, states_mode="only", states=["TX"], priority=900)
        self.assertEqual(engine.route(self.treatment()).rule.name, "only-late")

    def test_lower_priority_number_wins_within_same_state_mode(self):
        self.rule("b", self.network2, states_mode="only", states=["TX"], priority=20)
        self.rule("a", self.network, states_mode="only", states=["TX"], priority=10)
        self.assertEqual(engine.route(self.treatment()).rule.name, "a")

    def test_product_specific_breaks_priority_tie(self):
        self.rule("generic", self.network2, product=None, priority=10)
        self.rule("specific", self.network, priority=10)
        self.assertEqual(engine.route(self.treatment()).rule.name, "specific")

    def test_fill_type_and_term_specificity_break_tie(self):
        self.rule("any", self.network2)
        self.rule("termed", self.network, term_months=[3])
        self.assertEqual(engine.route(self.treatment()).rule.name, "termed")

    def test_oldest_rule_wins_final_tie(self):
        first = self.rule("first")
        self.rule("second", self.network2)
        self.assertEqual(engine.route(self.treatment()).rule, first)

    def test_non_matching_state_rules_are_ignored(self):
        self.rule("ca", self.network2, states_mode="only", states=["CA"])
        self.rule("tx-not", self.network2, states_mode="except", states=["TX"])
        self.rule("all", self.network)
        self.assertEqual(engine.route(self.treatment()).rule.name, "all")

    def test_other_product_and_inactive_rules_ignored(self):
        self.rule("other-product", self.network2, product=make_product("ed"))
        self.rule("inactive", self.network2, is_active=False)
        self.assertEqual(engine.route(self.treatment()).result, Result.FLAGGED)

    def test_term_filter(self):
        self.rule("t12", term_months=[12])
        self.assertEqual(engine.route(self.treatment()).flag_reason, "no_matching_rule")
        self.rule("t3", term_months=[3, 6])
        self.assertEqual(engine.route(self.treatment()).rule.name, "t3")

    def test_destination_is_set_on_treatment(self):
        self.rule("r", pharmacy=self.pharmacy)
        t = self.treatment()
        engine.route(t)
        t.refresh_from_db()
        self.assertEqual((t.network, t.pharmacy), (self.network, self.pharmacy))

    def test_state_codes_normalized(self):
        r = self.rule("r", states_mode="only", states=[" tx ", "Ca", "tx", ""])
        r.refresh_from_db()
        self.assertEqual(r.states, ["CA", "TX"])

    def test_inputs_hold_no_identifying_data(self):
        self.rule("r")
        d = engine.route(self.treatment())
        self.assertEqual(set(d.inputs), {"state", "product", "strength_mg", "fill_type", "term_months"})
        self.assertEqual(d.inputs["state"], "TX")


class FlaggingTests(RoutingBase):
    def test_no_match_flags_and_moves_to_routing_review(self):
        t = self.treatment()
        d = engine.route(t)
        t.refresh_from_db()
        self.assertEqual((d.result, d.flag_reason, d.rule), (Result.FLAGGED, "no_matching_rule", None))
        self.assertEqual(t.status, S.ROUTING_REVIEW)
        self.assertIsNone(t.network)

    def test_state_excluded_flags(self):
        self.rule("not-tx", states_mode="except", states=["TX"])
        self.assertEqual(engine.route(self.treatment()).flag_reason, "no_matching_rule")

    def test_missing_state_flags(self):
        self.rule("r")
        other = make_profile()
        d = engine.route(self.treatment(profile=other))
        self.assertEqual(d.flag_reason, "missing_state")
        self.assertEqual(d.treatment.status, S.ROUTING_REVIEW)

    def test_shipping_state_preferred_and_billing_ignored(self):
        p = make_profile()
        make_address(p, "NY", kind="billing", is_default=True)
        make_address(p, "FL", kind="home", is_default=True)
        make_address(p, "TX", kind="shipping", is_default=False)
        self.assertEqual(engine.patient_state(p), "TX")

    def test_home_used_when_no_shipping(self):
        p = make_profile()
        make_address(p, "NY", kind="billing")
        make_address(p, "FL", kind="home")
        self.assertEqual(engine.patient_state(p), "FL")

    def test_dose_out_of_range_flags(self):
        self.rule("small", dose_min_mg=Decimal("0.5"), dose_max_mg=Decimal("2.5"))
        t = self.treatment()
        d = engine.route(t)
        self.assertEqual(d.flag_reason, "dose_out_of_range")
        self.assertEqual(d.inputs["strength_mg"], "5.00")
        t.refresh_from_db()
        self.assertEqual(t.status, S.ROUTING_REVIEW)

    def test_dose_below_min_flags(self):
        self.rule("big", dose_min_mg=Decimal("7.5"))
        self.assertEqual(engine.route(self.treatment()).flag_reason, "dose_out_of_range")

    def test_dose_bounds_are_inclusive(self):
        self.rule("exact", dose_min_mg=Decimal("5"), dose_max_mg=Decimal("5"))
        self.assertEqual(engine.route(self.treatment()).result, Result.ROUTED)

    def test_dose_range_picks_matching_rule_among_several(self):
        self.rule("low", self.network2, dose_max_mg=Decimal("2.5"), priority=1)
        self.rule("high", self.network, dose_min_mg=Decimal("2.6"), priority=2)
        self.assertEqual(engine.route(self.treatment()).rule.name, "high")

    def test_missing_dose_flags_when_bounds_exist(self):
        self.rule("bounded", dose_max_mg=Decimal("15"))
        t = self.treatment(requested_strength_mg=None, variant=None)
        self.assertEqual(engine.route(t).flag_reason, "missing_dose")

    def test_missing_dose_routes_when_no_bounds(self):
        self.rule("open")
        t = self.treatment(requested_strength_mg=None, variant=None)
        self.assertEqual(engine.route(t).result, Result.ROUTED)

    def test_flag_does_not_force_invalid_transition(self):
        t = self.treatment(status=S.ACTIVE)
        d = engine.route(t, "refill")
        t.refresh_from_db()
        self.assertEqual(d.result, Result.FLAGGED)
        self.assertEqual(t.status, S.ACTIVE)

    def test_refill_due_can_go_to_review(self):
        t = self.treatment(status=S.REFILL_DUE)
        engine.route(t, "refill")
        t.refresh_from_db()
        self.assertEqual(t.status, S.ROUTING_REVIEW)

    def test_decision_recorded_per_attempt(self):
        t = self.treatment()
        engine.route(t)
        self.rule("r")
        engine.route(t)
        self.assertEqual(t.routing_decisions.count(), 2)


class FillTypeAndCapacityTests(RoutingBase):
    def test_refill_only_rule_skipped_for_initial(self):
        self.rule("refills", refill_only=True)
        self.assertEqual(engine.route(self.treatment()).flag_reason, "no_matching_rule")
        self.assertEqual(engine.route(self.treatment(), "refill").result, Result.ROUTED)

    def test_fill_type_specific_rules(self):
        self.rule("initial-only", self.network, fill_type="initial")
        self.rule("refill-only", self.network2, fill_type="refill")
        self.assertEqual(engine.route(self.treatment(), "initial").rule.name, "initial-only")
        self.assertEqual(engine.route(self.treatment(), "refill").rule.name, "refill-only")

    def test_refill_uses_prescribed_strength(self):
        self.rule("range", dose_min_mg=Decimal("7"), dose_max_mg=Decimal("8"))
        t = self.treatment(prescribed_strength_mg=Decimal("7.50"))
        self.assertEqual(engine.route(t, "initial").flag_reason, "dose_out_of_range")
        self.assertEqual(engine.route(t, "refill").result, Result.ROUTED)

    def test_route_errors_only_rule_needs_after_error(self):
        self.rule("primary", self.network, priority=1, states_mode="only", states=["CA"])
        self.rule("fallback", self.network2, route_errors_only=True)
        self.assertEqual(engine.route(self.treatment()).result, Result.FLAGGED)
        d = engine.route(self.treatment(), after_error=True)
        self.assertEqual(d.rule.name, "fallback")

    def test_daily_cap_flags_after_threshold(self):
        self.rule("capped", orders_per_day_threshold=2)
        results = [engine.route(self.treatment()) for _ in range(3)]
        self.assertEqual([r.result for r in results], [Result.ROUTED, Result.ROUTED, Result.FLAGGED])
        self.assertEqual(results[2].flag_reason, "daily_capacity_reached")

    def test_cap_falls_through_to_next_rule(self):
        self.rule("capped", self.network2, orders_per_day_threshold=1, priority=1)
        self.rule("backup", self.network, priority=2)
        names = [engine.route(self.treatment()).rule.name for _ in range(3)]
        self.assertEqual(names, ["capped", "backup", "backup"])

    def test_rerouting_same_treatment_does_not_consume_cap(self):
        self.rule("capped", orders_per_day_threshold=1)
        t = self.treatment()
        self.assertEqual(engine.route(t).result, Result.ROUTED)
        self.assertEqual(engine.route(t).result, Result.ROUTED)

    def test_yesterdays_orders_do_not_count(self):
        rule = self.rule("capped", orders_per_day_threshold=1)
        old = engine.route(self.treatment())
        RoutingDecision.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=2))
        self.assertEqual(engine.route(self.treatment()).rule, rule)


class ReplacementTests(RoutingBase):
    def setUp(self):
        super().setUp()
        self.target_variant = make_variant(self.product, "5.00")
        self.rule("primary", pharmacy=self.pharmacy)

    def replacement(self, **extra) -> ReplacementRule:
        return ReplacementRule.objects.create(
            source_variant=self.variant, source_pharmacy=self.pharmacy,
            target_variant=self.target_variant, target_pharmacy=self.pharmacy2, **extra,
        )

    def test_no_replacement_by_default(self):
        t = self.treatment()
        d = engine.route(t, "refill")
        t.refresh_from_db()
        self.assertEqual((t.pharmacy, t.variant, d.replacement_rule), (self.pharmacy, self.variant, None))

    def test_replacement_redirects_pharmacy_and_variant(self):
        rr = self.replacement()
        t = self.treatment()
        d = engine.route(t)
        t.refresh_from_db()
        self.assertEqual((t.pharmacy, t.variant, d.replacement_rule), (self.pharmacy2, self.target_variant, rr))
        self.assertEqual(d.inputs["replacement_rule_id"], str(rr.pk))

    def test_refill_only_replacement_skips_initial(self):
        self.replacement(refill_only=True)
        t = self.treatment()
        engine.route(t, "initial")
        t.refresh_from_db()
        self.assertEqual(t.pharmacy, self.pharmacy)
        engine.route(t, "refill")
        t.refresh_from_db()
        self.assertEqual(t.pharmacy, self.pharmacy2)

    def test_route_errors_only_replacement(self):
        self.replacement(route_errors_only=True)
        t = self.treatment()
        engine.route(t)
        t.refresh_from_db()
        self.assertEqual(t.pharmacy, self.pharmacy)
        t2 = self.treatment()
        engine.route(t2, after_error=True)
        t2.refresh_from_db()
        self.assertEqual(t2.pharmacy, self.pharmacy2)

    def test_replacement_threshold(self):
        self.replacement(orders_per_day_threshold=1)
        first, second = self.treatment(), self.treatment()
        engine.route(first)
        engine.route(second)
        first.refresh_from_db(), second.refresh_from_db()
        self.assertEqual((first.pharmacy, second.pharmacy), (self.pharmacy2, self.pharmacy))

    def test_inactive_and_other_source_ignored(self):
        self.replacement(is_active=False)
        ReplacementRule.objects.create(
            source_variant=self.variant, source_pharmacy=self.pharmacy2,
            target_variant=self.target_variant, target_pharmacy=self.pharmacy2,
        )
        t = self.treatment()
        engine.route(t)
        t.refresh_from_db()
        self.assertEqual(t.pharmacy, self.pharmacy)


class IsAvailableTests(RoutingBase):
    def test_per_state_modes(self):
        self.rule("only", states_mode="only", states=["TX", "FL"])
        self.assertTrue(engine.is_available("TX", self.variant))
        self.assertTrue(engine.is_available("fl", self.variant))
        self.assertFalse(engine.is_available("CA", self.variant))

    def test_except_mode(self):
        self.rule("except", states_mode="except", states=["NM", "KS", "WV"])
        self.assertTrue(engine.is_available("TX", self.variant))
        for blocked in ("NM", "KS", "WV"):
            self.assertFalse(engine.is_available(blocked, self.variant))

    def test_all_mode(self):
        self.rule("all")
        self.assertTrue(engine.is_available("AK", self.variant))

    def test_no_rules_or_inactive(self):
        self.assertFalse(engine.is_available("TX", self.variant))
        self.rule("off", is_active=False)
        self.assertFalse(engine.is_available("TX", self.variant))

    def test_blank_state_or_variant(self):
        self.rule("all")
        self.assertFalse(engine.is_available("", self.variant))
        self.assertFalse(engine.is_available("  ", self.variant))
        self.assertFalse(engine.is_available("TX", None))

    def test_other_product_not_available(self):
        self.rule("all", product=make_product("ed"))
        self.assertFalse(engine.is_available("TX", self.variant))

    def test_global_product_rule_applies(self):
        self.rule("global", product=None)
        self.assertTrue(engine.is_available("TX", self.variant))

    def test_dose_range_respected(self):
        self.rule("small", dose_max_mg=Decimal("2.5"))
        self.assertFalse(engine.is_available("TX", self.variant))
        self.assertTrue(engine.is_available("TX", make_variant(self.product, "2.50")))

    def test_variant_without_strength_is_available(self):
        self.rule("bounded", dose_max_mg=Decimal("2.5"))
        self.assertTrue(engine.is_available("TX", make_variant(self.product, None)))

    def test_refill_only_and_error_only_rules_do_not_count(self):
        self.rule("refills", refill_only=True)
        self.rule("refill-type", fill_type="refill")
        self.rule("fallback", route_errors_only=True)
        self.assertFalse(engine.is_available("TX", self.variant))


class ResolveAndRerunTests(RoutingBase):
    def setUp(self):
        super().setUp()
        self.staff = make_staff()
        self.t = self.treatment()
        self.flag = engine.route(self.t)
        self.t.refresh_from_db()

    def test_resolve_flag_routes_treatment(self):
        rule = self.rule("manual", pharmacy=self.pharmacy)
        with self.captureOnCommitCallbacks(execute=True):
            decision = engine.resolve_flag(self.flag, self.staff, rule)
        self.t.refresh_from_db()
        self.assertEqual((decision.result, decision.rule, decision.resolved_by), (Result.ROUTED, rule, self.staff))
        self.assertIsNotNone(decision.resolved_at)
        self.assertEqual((self.t.network, self.t.pharmacy), (self.network, self.pharmacy))
        self.hooks["submit_visit"].assert_called_once()

    def test_resolve_flag_requires_staff(self):
        rule = self.rule("manual")
        patient_user = self.profile.user
        with self.assertRaises(PermissionDenied):
            engine.resolve_flag(self.flag, patient_user, rule)
        self.flag.refresh_from_db()
        self.assertEqual(self.flag.result, Result.FLAGGED)

    def test_cannot_resolve_twice_or_a_routed_decision(self):
        rule = self.rule("manual")
        engine.resolve_flag(self.flag, self.staff, rule)
        with self.assertRaises(ValueError):
            engine.resolve_flag(self.flag, self.staff, rule)

    def test_rerun_after_rule_fix_routes_and_submits(self):
        self.rule("fixed")
        with self.captureOnCommitCallbacks(execute=True):
            new = engine.rerun(self.flag, self.staff)
        self.flag.refresh_from_db()
        self.assertEqual(new.result, Result.ROUTED)
        self.assertIsNotNone(self.flag.resolved_at)
        self.assertEqual(self.flag.resolved_by, self.staff)
        self.hooks["submit_visit"].assert_called_once()

    def test_rerun_still_flagged_leaves_single_open_flag(self):
        new = engine.rerun(self.flag, self.staff)
        self.assertEqual(new.result, Result.FLAGGED)
        open_flags = RoutingDecision.objects.filter(result=Result.FLAGGED, resolved_at__isnull=True)
        self.assertEqual(list(open_flags), [new])
        self.hooks["submit_visit"].assert_not_called()

    def test_rerun_resolved_flag_is_rejected(self):
        engine.rerun(self.flag, self.staff)
        with self.assertRaises(ValueError):
            engine.rerun(self.flag, self.staff)

    def test_rerun_keeps_refill_fill_type(self):
        t = self.treatment(status=S.REFILL_DUE)
        flag = engine.route(t, "refill")
        self.rule("refills", refill_only=True)
        self.assertEqual(engine.rerun(flag, self.staff).result, Result.ROUTED)

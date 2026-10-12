"""Walk every branch of the shipped weight loss definition with sample answers."""
from django.test import SimpleTestCase

from apps.questionnaires import engine
from apps.questionnaires.engine import AnswerError

from .flow import BASE, BASICS, FILE_ID, TODAY, current_user, everywhere, load_definition, walk

DEF = load_definition()


def outcome(overrides=None, **kw):
    node, store, seen = walk(DEF, overrides, **kw)
    return node, store, seen, engine.evaluate(DEF, store, availability=kw.get("availability", everywhere))


class NewUserFlowTests(SimpleTestCase):
    def test_new_user_semaglutide_reaches_thank_you(self):
        node, store, seen, out = outcome()
        self.assertEqual(node["id"], "thank_you")
        self.assertTrue(out.completed and out.eligible and not out.disqualified)
        self.assertEqual(out.selected_variant_key, "semaglutide.b12.titration")
        self.assertEqual(out.candidate_plan_slugs, ["semaglutide-monthly", "semaglutide-3month", "semaglutide-6month", "semaglutide-12month"])
        self.assertIn("glp1_new_user", out.flags)
        self.assertEqual(store["phase_router"], {"value": "titration"})

    def test_new_user_path_excludes_current_user_nodes(self):
        _, _, seen, _ = outcome()
        for skipped in ("current_med", "current_dose", "dose_preference", "last_injection", "glp1_photo", "side_effects", "bmi_current", "glp1_proof", "pregnancy"):
            self.assertNotIn(skipped, seen)
        self.assertLess(seen.index("auth"), seen.index("basics"))
        self.assertLess(seen.index("checkout"), seen.index("medical_intro"))
        self.assertLess(seen.index("checkout"), seen.index("conditions"))

    def test_new_user_tirzepatide_offers_starter_pack(self):
        _, _, seen, out = outcome({"drug_choice": "tirzepatide", "checkout": {"plan_slug": "tirzepatide-starter-pack"}})
        self.assertIn("additive_tirzepatide", seen)
        self.assertNotIn("additive_semaglutide", seen)
        self.assertEqual(out.selected_variant_key, "tirzepatide.glycine.titration")
        self.assertEqual(out.candidate_plan_slugs[0], "tirzepatide-starter-pack")
        self.assertEqual(len(out.candidate_plan_slugs), 5)

    def test_all_eight_checkout_variants(self):
        keys = set()
        for drug in ("semaglutide", "tirzepatide"):
            for additive in ("b12", "glycine"):
                for glp1, pref, phase in (("never", "same", "titration"), ("current", "same", "maintenance")):
                    overrides = {"drug_choice": drug, f"additive_{drug}": additive, "glp1_history": glp1,
                                 "dose_preference": pref, "checkout": {"plan_slug": f"{drug}-monthly"}}
                    _, store, _, out = outcome(overrides)
                    self.assertEqual(out.selected_variant_key, f"{drug}.{additive}.{phase}")
                    self.assertIn(f"{drug}-monthly", out.candidate_plan_slugs)
                    keys.add(out.selected_variant_key)
        self.assertEqual(len(keys), 8)
        self.assertEqual(len(DEF["nodes"]["checkout"]["variants"]), 8)

    def test_stops_at_checkout_until_paid(self):
        node, store, _ = walk(DEF, stop_at="checkout")
        self.assertEqual(node["id"], "checkout")
        out = engine.evaluate(DEF, {k: v for k, v in store.items()}, availability=everywhere)
        self.assertEqual(out.pending_node, "checkout")


class CurrentUserFlowTests(SimpleTestCase):
    def test_current_user_staying_on_dose_is_maintenance(self):
        node, store, seen, out = outcome(current_user())
        self.assertEqual(node["id"], "thank_you")
        self.assertEqual(out.selected_variant_key, "semaglutide.b12.maintenance")
        self.assertEqual(store["phase_router"], {"value": "maintenance"})
        for expected in ("current_med", "current_dose", "dose_preference", "last_injection", "glp1_photo", "side_effects", "bmi_current", "glp1_proof"):
            self.assertIn(expected, seen)
        self.assertNotIn("bmi_new", seen)
        self.assertNotIn("dose_down_detail", seen)
        self.assertIn("glp1_experienced", out.flags)

    def test_past_user_uses_current_branch(self):
        _, _, seen, out = outcome({"glp1_history": "past"})
        self.assertIn("bmi_current", seen)
        self.assertIn("glp1_experienced", out.flags)

    def test_going_down_in_dose_is_titration_with_detail(self):
        _, store, seen, out = outcome(current_user(dose_preference="down"))
        self.assertIn("dose_down_detail", seen)
        self.assertEqual(out.selected_variant_key, "semaglutide.b12.titration")

    def test_current_tirzepatide_user_does_not_get_starter_pack(self):
        _, _, _, out = outcome(current_user(current_med="tirzepatide", current_dose="tirz_5mg", drug_choice="tirzepatide",
                                             dose_preference="down", checkout={"plan_slug": "tirzepatide-monthly"}))
        self.assertEqual(out.selected_variant_key, "tirzepatide.glycine.titration")
        self.assertNotIn("tirzepatide-starter-pack", out.candidate_plan_slugs)

    def test_side_effects_branch_and_flag(self):
        _, _, seen, out = outcome(current_user(side_effects="yes"))
        self.assertIn("side_effects_detail", seen)
        self.assertIn("current_side_effects", out.flags)
        _, _, seen, _ = outcome(current_user())
        self.assertNotIn("side_effects_detail", seen)

    def test_gap_flag(self):
        _, _, _, out = outcome(current_user(last_injection="over_4_weeks"))
        self.assertIn("glp1_gap_over_4_weeks", out.flags)

    def test_dose_options_depend_on_medication(self):
        _, store, _ = walk(DEF, current_user(), stop_at="current_dose")
        node = DEF["nodes"]["current_dose"]
        sema_keys = {o["key"] for o in engine.visible_options(node, {"current_med": "semaglutide"})}
        tirz_keys = {o["key"] for o in engine.visible_options(node, {"current_med": "tirzepatide"})}
        self.assertEqual(sema_keys, {"sema_0_25mg", "sema_0_5mg", "sema_1_0mg", "sema_1_7mg", "sema_2_4mg"})
        self.assertEqual(len(tirz_keys), 6)
        with self.assertRaises(AnswerError):
            engine.validate_answer(node, "tirz_5mg", answers={"current_med": "semaglutide"})

    def test_glp1_proof_can_be_skipped_only_without_photo(self):
        node = DEF["nodes"]["glp1_proof"]
        engine.validate_answer(node, {"skipped": True}, answers={"glp1_photo": "no"})
        with self.assertRaises(AnswerError):
            engine.validate_answer(node, {"skipped": True}, answers={"glp1_photo": "yes"})

    def test_id_photo_is_required_for_everyone(self):
        node = DEF["nodes"]["id_verification"]
        with self.assertRaises(AnswerError):
            engine.validate_answer(node, {"skipped": True}, answers={"glp1_photo": "no"})


class DisqualificationTests(SimpleTestCase):
    def assert_disqualified(self, overrides, reason, node_id, **kw):
        node, store, seen, out = outcome(overrides, **kw)
        self.assertEqual(node["id"], node_id)
        self.assertEqual(node["type"], "no_proceed")
        self.assertTrue(out.disqualified and not out.eligible and not out.completed)
        self.assertEqual(out.disqualify_reason, reason)
        return seen

    def test_under_18(self):
        seen = self.assert_disqualified({"basics": {**BASICS, "dob": "2010-01-01"}}, "under_18", "no_proceed_age")
        self.assertNotIn("glp1_history", seen)

    def test_exactly_18_today_is_allowed_and_day_before_is_not(self):
        node, _, _, _ = outcome({"basics": {**BASICS, "dob": "2008-10-06"}})
        self.assertEqual(node["id"], "thank_you")
        self.assert_disqualified({"basics": {**BASICS, "dob": "2008-10-07"}}, "under_18", "no_proceed_age")

    def test_new_user_bmi_below_25(self):
        self.assert_disqualified({"bmi_new": {"height_feet": 5, "height_inches": 6, "weight_lbs": 154}}, "bmi_below_minimum", "no_proceed_bmi")

    def test_new_user_bmi_exactly_25_passes(self):
        node, store, _, _ = outcome({"bmi_new": {"height_feet": 5, "height_inches": 6, "weight_lbs": 155}})
        self.assertEqual(store["bmi_new"]["bmi"], 25.0)
        self.assertEqual(node["id"], "thank_you")

    def test_current_user_bmi_below_20(self):
        self.assert_disqualified(current_user(bmi_current={"height_feet": 5, "height_inches": 6, "weight_lbs": 123}), "bmi_below_minimum", "no_proceed_bmi")

    def test_current_user_bmi_between_20_and_25_passes(self):
        node, store, _, _ = outcome(current_user(bmi_current={"height_feet": 5, "height_inches": 6, "weight_lbs": 124}))
        self.assertEqual(store["bmi_current"]["bmi"], 20.0)
        self.assertEqual(node["id"], "thank_you")

    def test_same_weight_differs_by_user_type(self):
        weight = {"height_feet": 5, "height_inches": 6, "weight_lbs": 140}
        node, _, _, _ = outcome(current_user(bmi_current=weight))
        self.assertEqual(node["id"], "thank_you")
        self.assert_disqualified({"bmi_new": weight}, "bmi_below_minimum", "no_proceed_bmi")

    def test_state_unavailable_for_chosen_drug_only(self):
        only_sema = lambda state, drug: drug == "semaglutide"  # noqa: E731
        seen = self.assert_disqualified({"drug_choice": "tirzepatide"}, "state_unavailable", "no_proceed_state", availability=only_sema)
        self.assertNotIn("checkout", seen)
        node, _, _, _ = outcome({"drug_choice": "semaglutide"}, availability=only_sema)
        self.assertEqual(node["id"], "thank_you")

    def test_state_unavailable_passes_the_patients_state(self):
        calls = []
        outcome({}, availability=lambda s, d: calls.append((s, d)) or True)
        self.assertEqual(calls[0], ("TX", "semaglutide"))

    def test_state_unavailable_page_collects_email(self):
        node = DEF["nodes"]["no_proceed_state"]
        self.assertTrue(node["collect_email"])
        self.assertEqual(engine.validate_answer(node, {"email": "x@y.com"}), {"email": "x@y.com"})

    def test_gastric_bypass(self):
        self.assert_disqualified({"gastric_bypass": "yes"}, "recent_gastric_bypass", "no_proceed_bypass")

    def test_pregnancy_statuses(self):
        female = {**BASICS, "sex_at_birth": "female"}
        for status in ("pregnant", "breastfeeding", "planning"):
            self.assert_disqualified({"basics": female, "pregnancy": status}, "pregnancy_or_breastfeeding", "no_proceed_pregnancy")

    def test_female_not_pregnant_gets_consent_male_skips(self):
        female = {**BASICS, "sex_at_birth": "female"}
        node, _, seen, _ = outcome({"basics": female})
        self.assertEqual(node["id"], "thank_you")
        self.assertIn("pregnancy_consent", seen)
        _, _, seen, _ = outcome()
        self.assertNotIn("pregnancy", seen)

    def test_gallbladder_triggers_consent(self):
        _, _, seen, out = outcome({"conditions": ["gallbladder", "kidney_disease"]})
        self.assertIn("gallbladder_consent", seen)
        self.assertIn("gallbladder", out.flags)
        _, _, seen, _ = outcome({"conditions": ["kidney_disease"]})
        self.assertNotIn("gallbladder_consent", seen)

    def test_clinical_condition_flags_do_not_disqualify(self):
        _, _, _, out = outcome({"conditions": ["pancreatitis", "thyroid_cancer_men2", "type1_diabetes", "eating_disorder"]})
        self.assertTrue(out.completed)
        self.assertEqual(set(out.flags) & {"pancreatitis", "thyroid_cancer_men2", "type1_diabetes", "eating_disorder"},
                         {"pancreatitis", "thyroid_cancer_men2", "type1_diabetes", "eating_disorder"})

    def test_conditions_none_is_exclusive(self):
        with self.assertRaises(AnswerError):
            walk(DEF, {"conditions": ["none", "gallbladder"]})

    def test_declined_consent_blocks_progress(self):
        for node_id in ("bmi_consent", "glp1_consent", "truthfulness_consent", "weight_loss_consent"):
            with self.assertRaises(AnswerError, msg=node_id):
                walk(DEF, {node_id: False})


class ClientCannotSkipTests(SimpleTestCase):
    def test_cannot_advance_without_answer(self):
        with self.assertRaises(engine.NodeNotAnswered):
            engine.next_node(DEF, {}, "motivation")

    def test_invalid_answer_never_advances(self):
        with self.assertRaises(AnswerError):
            walk(DEF, {"motivation": "not-an-option"})

    def test_next_node_follows_engine_not_input(self):
        self.assertEqual(engine.next_node(DEF, {"motivation": "health"}, "motivation")["id"], "weight_goal")

    def test_answers_for_other_nodes_do_not_change_routing(self):
        extra = {"motivation": "health", "gastric_bypass": "yes", "checkout": {"plan_slug": "x"}}
        self.assertEqual(engine.next_node(DEF, extra, "motivation")["id"], "weight_goal")

    def test_progress_increases_along_the_flow(self):
        _, _, seen = walk(DEF)
        values = [engine.progress(DEF, [n for n in seen[:i] if DEF["nodes"][n]["type"] not in engine.AUTO_TYPES], seen[i])
                  for i in range(len(seen) - 1)]
        self.assertEqual(values, sorted(values))
        self.assertEqual(values[0], 0.0)
        self.assertTrue(values[-1] > 0.9)

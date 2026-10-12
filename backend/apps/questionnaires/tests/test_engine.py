"""Engine unit tests. No database: everything here is pure."""
from datetime import date

from django.test import SimpleTestCase

from apps.questionnaires import engine
from apps.questionnaires.engine import AnswerError, EngineError, NodeNotAnswered, validate_answer

TODAY = date(2026, 10, 6)


def check(node, value, **kw):
    kw.setdefault("today", TODAY)
    return validate_answer(node, value, **kw)


def code(node, value, **kw):
    """The AnswerError code raised for an invalid value (fails if none is raised)."""
    try:
        check(node, value, **kw)
    except AnswerError as exc:
        return exc.code
    raise AssertionError("expected AnswerError")


RADIO = {"id": "r", "type": "radio", "options": [{"key": "a", "label": "A"}, {"key": "b", "label": "B"}]}
MULTI = {"id": "m", "type": "multi_select", "options": [
    {"key": "a", "label": "A"}, {"key": "b", "label": "B"}, {"key": "none", "label": "None", "exclusive": True}]}

ATTACKS = ["' OR 1=1; DROP TABLE users;--", "<script>alert(1)</script>", "../../etc/passwd", "$(rm -rf /)", "a" * 100000, "\x00evil"]


class RadioTests(SimpleTestCase):
    def test_valid(self):
        self.assertEqual(check(RADIO, "a"), "a")

    def test_unknown_option(self):
        self.assertEqual(code(RADIO, "z"), "invalid_option")

    def test_wrong_types(self):
        for bad in (None, 1, ["a"], {"a": 1}, True):
            self.assertEqual(code(RADIO, bad), "invalid_type")

    def test_conditional_options(self):
        node = {"id": "d", "type": "radio", "options": [
            {"key": "x", "label": "X", "when": {"ref": "med", "equals": "one"}},
            {"key": "y", "label": "Y", "when": {"ref": "med", "equals": "two"}}]}
        self.assertEqual(check(node, "x", answers={"med": "one"}), "x")
        self.assertEqual(code(node, "y", answers={"med": "one"}), "invalid_option")
        self.assertEqual(code(node, "x", answers={}), "invalid_option")

    def test_attack_strings_are_not_options(self):
        for attack in ATTACKS:
            self.assertEqual(code(RADIO, attack), "invalid_option")


class MultiSelectTests(SimpleTestCase):
    def test_valid_is_ordered_by_options(self):
        self.assertEqual(check(MULTI, ["b", "a"]), ["a", "b"])

    def test_empty_rejected_unless_optional(self):
        self.assertEqual(code(MULTI, []), "required")
        self.assertEqual(check({**MULTI, "optional": True}, []), [])

    def test_duplicates_and_unknown(self):
        self.assertEqual(code(MULTI, ["a", "a"]), "duplicate_option")
        self.assertEqual(code(MULTI, ["z"]), "invalid_option")

    def test_exclusive(self):
        self.assertEqual(check(MULTI, ["none"]), ["none"])
        self.assertEqual(code(MULTI, ["none", "a"]), "exclusive_option")

    def test_max_select(self):
        self.assertEqual(code({**MULTI, "max_select": 1}, ["a", "b"]), "too_many")

    def test_types(self):
        self.assertEqual(code(MULTI, "a"), "invalid_type")
        self.assertEqual(code(MULTI, [1]), "invalid_type")


class TextTests(SimpleTestCase):
    def test_trims_and_limits(self):
        self.assertEqual(check({"type": "text"}, "  hi  "), "hi")
        self.assertEqual(code({"type": "text", "max_length": 5}, "toolong"), "too_long")
        self.assertEqual(code({"type": "text"}, "   "), "required")

    def test_optional_text_allows_empty(self):
        self.assertEqual(check({"type": "text", "optional": True}, ""), "")

    def test_rejects_non_strings_and_control_characters(self):
        self.assertEqual(code({"type": "text"}, 5), "invalid_type")
        self.assertEqual(code({"type": "text"}, "a\x00b"), "invalid_characters")
        self.assertEqual(code({"type": "text"}, "line\nbreak"), "invalid_characters")

    def test_email_format(self):
        node = {"type": "text", "format": "email"}
        self.assertEqual(check(node, " Jane@Example.COM "), "jane@example.com")
        for bad in ("nope", "a@b", "a b@c.com", "<x>@a.com", "a@b.c"):
            self.assertEqual(code(node, bad), "invalid_email")

    def test_zip_format(self):
        node = {"type": "text", "format": "zip"}
        self.assertEqual(check(node, "77002-1234"), "77002")
        self.assertEqual(code(node, "7700"), "invalid_zip")

    def test_overflow(self):
        self.assertEqual(code({"type": "text"}, "a" * 100000), "too_long")


class TextareaTests(SimpleTestCase):
    def test_allows_newlines_and_inert_attack_text(self):
        value = check({"type": "textarea"}, "line one\nline two <b>bold</b> ' OR 1=1")
        self.assertIn("line two", value)

    def test_limits(self):
        self.assertEqual(code({"type": "textarea", "max_length": 10}, "x" * 11), "too_long")
        self.assertEqual(check({"type": "textarea", "optional": True}, ""), "")
        self.assertEqual(code({"type": "textarea"}, ""), "required")

    def test_control_characters(self):
        self.assertEqual(code({"type": "textarea"}, "a\x00"), "invalid_characters")

    def test_overflow(self):
        self.assertEqual(code({"type": "textarea"}, "x" * 2_000_000), "too_long")


class NumberTests(SimpleTestCase):
    def test_range_and_integer(self):
        node = {"type": "number", "min": 1, "max": 10, "integer": True}
        self.assertEqual(check(node, 5), 5)
        self.assertEqual(check(node, "7"), 7)
        self.assertEqual(code(node, 0), "too_small")
        self.assertEqual(code(node, 11), "too_large")
        self.assertEqual(code(node, 2.5), "not_integer")

    def test_rejects_bool_nan_inf_and_garbage(self):
        node = {"type": "number"}
        self.assertEqual(code(node, True), "invalid_type")
        self.assertEqual(code(node, float("nan")), "invalid_number")
        self.assertEqual(code(node, float("inf")), "invalid_number")
        self.assertEqual(code(node, "abc"), "invalid_number")
        self.assertEqual(code(node, [1]), "invalid_type")
        self.assertEqual(code(node, "nan"), "invalid_number")


class DateTests(SimpleTestCase):
    def test_valid(self):
        self.assertEqual(check({"type": "date"}, "2020-02-29"), "2020-02-29")

    def test_invalid_formats(self):
        for bad in ("02/29/2020", "2021-02-29", "2020-13-01", "2020-1-1", "", None, 20200101, "1899-12-31"):
            self.assertIn(code({"type": "date"}, bad), ("invalid_date",))

    def test_not_future_and_min_age(self):
        self.assertEqual(code({"type": "date", "not_future": True}, "2026-10-07"), "future_date")
        self.assertEqual(check({"type": "date", "not_future": True}, "2026-10-06"), "2026-10-06")
        self.assertEqual(code({"type": "date", "min_age": 18}, "2008-10-07"), "too_young")
        self.assertEqual(check({"type": "date", "min_age": 18}, "2008-10-06"), "2008-10-06")


class EmptyPageAndAuthTests(SimpleTestCase):
    def test_empty_page_accepts_continue(self):
        for ok in (None, True, {}, {"acknowledged": True}):
            self.assertTrue(check({"type": "empty_page"}, ok))

    def test_empty_page_rejects_payloads(self):
        self.assertEqual(code({"type": "empty_page"}, "x"), "invalid_type")
        self.assertEqual(code({"type": "empty_page"}, 1), "invalid_type")
        self.assertEqual(code({"type": "empty_page"}, {"evil": 1}), "invalid_type")

    def test_auth_carries_no_credentials(self):
        self.assertTrue(check({"type": "auth"}, None))
        self.assertEqual(code({"type": "auth"}, {"email": "a@b.com"}), "invalid_type")


class BasicsTests(SimpleTestCase):
    NODE = {"type": "basics"}
    GOOD = {"dob": "1985-04-12", "sex_at_birth": "female", "state": "tx", "zip": "77002", "phone": "713-555-0123"}

    def test_normalizes(self):
        result = check(self.NODE, self.GOOD)
        self.assertEqual(result["state"], "TX")
        self.assertEqual(result["phone"], "+17135550123")
        self.assertEqual(result["age_years"], 41)

    def test_age_boundaries(self):
        self.assertEqual(check(self.NODE, {**self.GOOD, "dob": "2008-10-06"})["age_years"], 18)
        self.assertEqual(check(self.NODE, {**self.GOOD, "dob": "2008-10-07"})["age_years"], 17)

    def test_invalid_dob(self):
        for bad in ("2026-10-07", "1899-01-01", "1900-01-01", "garbage", None):
            with self.assertRaises(AnswerError):
                check(self.NODE, {**self.GOOD, "dob": bad})

    def test_other_fields(self):
        for key, bad in (("sex_at_birth", "other"), ("state", "ZZ"), ("state", None), ("zip", "1234"),
                         ("zip", "abcde"), ("phone", "123"), ("phone", "000-000-0000"), ("phone", "abc"),
                         ("phone", "713-055-0123")):
            with self.assertRaises(AnswerError, msg=f"{key}={bad}"):
                check(self.NODE, {**self.GOOD, key: bad})

    def test_unknown_fields_and_types(self):
        with self.assertRaises(AnswerError):
            check(self.NODE, {**self.GOOD, "is_admin": True})
        with self.assertRaises(AnswerError):
            check(self.NODE, "nope")

    def test_phone_with_country_code(self):
        self.assertEqual(check(self.NODE, {**self.GOOD, "phone": "+1 (713) 555-0123"})["phone"], "+17135550123")

    def test_attack_strings_in_gender_identity(self):
        result = check(self.NODE, {**self.GOOD, "gender_identity": "non-binary"})
        self.assertEqual(result["gender_identity"], "non-binary")
        with self.assertRaises(AnswerError):
            check(self.NODE, {**self.GOOD, "gender_identity": "x" * 500})


class BmiTests(SimpleTestCase):
    NODE = {"type": "bmi", "min_bmi": 25}

    def test_computes_bmi(self):
        result = check(self.NODE, {"height_feet": 5, "height_inches": 6, "weight_lbs": 220})
        self.assertEqual(result["height_in"], 66)
        self.assertEqual(result["bmi"], 35.5)

    def test_bounds(self):
        good = {"height_feet": 5, "height_inches": 6, "weight_lbs": 200}
        for key, bad in (("height_feet", 2), ("height_feet", 9), ("height_inches", 12), ("height_inches", -1),
                         ("weight_lbs", 50), ("weight_lbs", 701), ("weight_lbs", "x"), ("weight_lbs", True),
                         ("height_feet", 5.5), ("weight_lbs", float("nan"))):
            with self.assertRaises(AnswerError, msg=f"{key}={bad}"):
                check(self.NODE, {**good, key: bad})

    def test_height_range_and_missing(self):
        with self.assertRaises(AnswerError):
            check(self.NODE, {"height_feet": 8, "height_inches": 5, "weight_lbs": 200})
        with self.assertRaises(AnswerError):
            check(self.NODE, {"height_feet": 5, "weight_lbs": 200})


class SafetyConsentTests(SimpleTestCase):
    NODE = {"id": "c", "type": "safety_consent", "consent_kind": "glp1"}

    def test_accepts_true(self):
        for ok in (True, {"accepted": True}):
            self.assertEqual(check(self.NODE, ok), {"accepted": True, "consent_kind": "glp1"})

    def test_rejects_everything_else(self):
        for bad in (False, None, "true", 1, {"accepted": False}, {"accepted": "yes"}, {}, {"accepted": True, "x": 1}):
            self.assertEqual(code(self.NODE, bad), "consent_required")


class ListNodeTests(SimpleTestCase):
    def test_allergies(self):
        node = {"type": "allergies"}
        self.assertEqual(check(node, {"none": True}), {"none": True, "items": []})
        result = check(node, {"items": [{"name": "Penicillin", "reaction": "Hives", "severity": "mild"}]})
        self.assertEqual(result["items"][0]["name"], "Penicillin")

    def test_allergies_failures(self):
        node = {"type": "allergies"}
        for bad in ({}, {"items": []}, {"none": True, "items": [{"name": "x"}]}, {"items": "x"}, "x",
                    {"items": [{"name": ""}]}, {"items": [{"name": "Pen", "severity": "huge"}]},
                    {"items": [{"name": "Pen", "extra": 1}]}, {"items": [{"name": "Pen"}] * 26}):
            with self.assertRaises(AnswerError, msg=str(bad)[:60]):
                check(node, bad)

    def test_names_reject_injection(self):
        for node_type in ("allergies", "add_medication", "med_conditions"):
            for attack in ATTACKS[:5]:
                with self.assertRaises(AnswerError, msg=f"{node_type}:{attack[:20]}"):
                    check({"type": node_type}, {"items": [{"name": attack}]})

    def test_add_medication(self):
        result = check({"type": "add_medication"}, {"items": [{"name": "Metformin", "dose": "500 mg", "frequency": "twice daily"}]})
        self.assertEqual(result["items"][0]["dose"], "500 mg")
        with self.assertRaises(AnswerError):
            check({"type": "add_medication"}, {"items": [{"name": "Metformin", "dose": "<b>"}]})
        with self.assertRaises(AnswerError):
            check({"type": "add_medication"}, {"items": [{"name": "m"}] * 41})

    def test_med_conditions(self):
        node = {"type": "med_conditions"}
        result = check(node, {"items": [{"name": "Asthma", "notes": "Since childhood\nmild", "diagnosed_on": "2010-05-01"}]})
        self.assertEqual(result["items"][0]["diagnosed_on"], "2010-05-01")
        for bad in ("2027-01-01", "1800-01-01", "nope"):
            with self.assertRaises(AnswerError):
                check(node, {"items": [{"name": "Asthma", "diagnosed_on": bad}]})


class FileInputTests(SimpleTestCase):
    FID = "123e4567-e89b-12d3-a456-426614174000"

    def test_valid(self):
        self.assertEqual(check({"type": "file_input"}, {"file_ids": [self.FID.upper()]}), {"file_ids": [self.FID]})

    def test_required(self):
        for bad in ({}, {"file_ids": []}, {"file_ids": ["not-a-uuid"]}, {"file_ids": [1]}, {"file_ids": "x"}, "x"):
            with self.assertRaises(AnswerError):
                check({"type": "file_input"}, bad)

    def test_max_files_and_duplicates(self):
        with self.assertRaises(AnswerError):
            check({"type": "file_input"}, {"file_ids": [self.FID, "123e4567-e89b-12d3-a456-426614174001"]})
        with self.assertRaises(AnswerError):
            check({"type": "file_input", "max_files": 2}, {"file_ids": [self.FID, self.FID]})

    def test_skip_only_when_optional(self):
        self.assertEqual(check({"type": "file_input", "optional": True}, {"skipped": True}), {"file_ids": []})
        with self.assertRaises(AnswerError):
            check({"type": "file_input"}, {"skipped": True})
        cond = {"type": "file_input", "optional_when": {"ref": "photo", "equals": "no"}}
        self.assertEqual(check(cond, {"skipped": True}, answers={"photo": "no"}), {"file_ids": []})
        with self.assertRaises(AnswerError):
            check(cond, {"skipped": True}, answers={"photo": "yes"})

    def test_id_photo_uses_same_rules(self):
        self.assertEqual(check({"type": "id_photo"}, {"file_ids": [self.FID]}), {"file_ids": [self.FID]})
        with self.assertRaises(AnswerError):
            check({"type": "id_photo"}, {"skipped": True})


class RouterAndTerminalTests(SimpleTestCase):
    def test_routers_cannot_be_answered(self):
        for kind in ("zip_router", "answer_router"):
            self.assertEqual(code({"type": kind}, {"available": True}), "not_answerable")

    def test_terminals_reject_answers(self):
        self.assertEqual(code({"type": "thank_you"}, {}), "terminal")
        self.assertEqual(code({"type": "no_proceed"}, {}), "terminal")

    def test_no_proceed_email_capture(self):
        node = {"type": "no_proceed", "collect_email": True}
        self.assertEqual(check(node, {"email": "A@B.com"}), {"email": "a@b.com"})
        with self.assertRaises(AnswerError):
            check(node, {"email": "bad"})
        with self.assertRaises(AnswerError):
            check(node, {"email": "a@b.com", "extra": 1})

    def test_unknown_node_type(self):
        with self.assertRaises(EngineError):
            check({"type": "mystery"}, 1)


CHECKOUT = {
    "id": "checkout", "type": "checkout", "drug_ref": "drug", "additive_refs": ["add_a", "add_b"], "phase_ref": "phase.value",
    "new_user_when": {"ref": "hist", "equals": "never"}, "new_user_only_plans": ["starter"],
    "variants": {"d.x.titration": {"plan_slugs": ["starter", "m1"]}, "d.x.maintenance": {"plan_slugs": ["m1"]}},
}
CHECKOUT_ANSWERS = {"drug": "d", "add_b": "x", "phase": {"value": "titration"}, "hist": "never"}


class CheckoutTests(SimpleTestCase):
    def test_variant_key_and_plans(self):
        self.assertEqual(engine.checkout_variant_key(CHECKOUT, CHECKOUT_ANSWERS), "d.x.titration")
        self.assertEqual(engine.checkout_plan_slugs(CHECKOUT, CHECKOUT_ANSWERS), ["starter", "m1"])

    def test_starter_hidden_for_experienced_users(self):
        answers = {**CHECKOUT_ANSWERS, "hist": "current"}
        self.assertEqual(engine.checkout_plan_slugs(CHECKOUT, answers), ["m1"])

    def test_valid_choice(self):
        result = check(CHECKOUT, {"plan_slug": "m1"}, answers=CHECKOUT_ANSWERS)
        self.assertEqual(result, {"plan_slug": "m1", "variant_key": "d.x.titration"})

    def test_rejects_plan_not_offered(self):
        for bad in ({"plan_slug": "other"}, {"plan_slug": "starter", "x": 1}, {"plan_slug": 1}, {}):
            with self.assertRaises(AnswerError):
                check(CHECKOUT, bad, answers=CHECKOUT_ANSWERS)
        with self.assertRaises(AnswerError):
            check(CHECKOUT, {"plan_slug": "starter"}, answers={**CHECKOUT_ANSWERS, "hist": "current"})

    def test_missing_choices_offer_nothing(self):
        self.assertEqual(engine.checkout_variant_key(CHECKOUT, {}), "")
        with self.assertRaises(AnswerError):
            check(CHECKOUT, {"plan_slug": "m1"}, answers={})


class ConditionTests(SimpleTestCase):
    A = {"n": 5, "s": "x", "l": ["a", "b"], "d": {"k": 1}, "f": False}

    def test_operators(self):
        c = engine.check
        self.assertTrue(c({"ref": "s", "equals": "x"}, self.A))
        self.assertTrue(c({"ref": "s", "not_equals": "y"}, self.A))
        self.assertFalse(c({"ref": "missing", "not_equals": "y"}, self.A))
        self.assertTrue(c({"ref": "s", "in": ["x", "y"]}, self.A))
        self.assertTrue(c({"ref": "s", "not_in": ["y"]}, self.A))
        self.assertTrue(c({"ref": "l", "contains": "a"}, self.A))
        self.assertTrue(c({"ref": "l", "contains_any": ["z", "b"]}, self.A))
        self.assertFalse(c({"ref": "s", "contains": "x"}, self.A))
        self.assertTrue(c({"ref": "d.k", "equals": 1}, self.A))
        self.assertTrue(c({"ref": "missing", "exists": False}, self.A))
        self.assertTrue(c({"ref": "f", "exists": True}, self.A))
        for op, val, expect in (("lt", 6, True), ("lte", 5, True), ("gt", 5, False), ("gte", 5, True)):
            self.assertEqual(c({"ref": "n", op: val}, self.A), expect)

    def test_numeric_ops_ignore_bools_and_missing(self):
        self.assertFalse(engine.check({"ref": "f", "lt": 5}, self.A))
        self.assertFalse(engine.check({"ref": "nope", "lt": 5}, self.A))

    def test_combinators(self):
        t, f = {"ref": "s", "equals": "x"}, {"ref": "s", "equals": "q"}
        self.assertTrue(engine.check({"all": [t, t]}, self.A))
        self.assertFalse(engine.check({"all": [t, f]}, self.A))
        self.assertTrue(engine.check({"any": [f, t]}, self.A))
        self.assertTrue(engine.check({"not": f}, self.A))
        self.assertTrue(engine.check(None, self.A))
        self.assertTrue(engine.check({}, self.A))

    def test_unsupported_condition(self):
        with self.assertRaises(EngineError):
            engine.check({"ref": "s", "weird": 1}, self.A)


ROUTING = {
    "start": "a",
    "nodes": {
        "a": {"id": "a", "type": "radio", "options": [{"key": "go", "label": "g"}, {"key": "stop", "label": "s"}],
              "routes": [{"when": {"ref": "a", "equals": "stop"}, "goto": "no"}], "next": "zip"},
        "zip": {"id": "zip", "type": "zip_router", "drug_ref": "d", "state_ref": "st", "unavailable_goto": "no", "next": "phase"},
        "phase": {"id": "phase", "type": "answer_router", "rules": [{"when": {"ref": "a", "equals": "go"}, "value": "fast"}],
                  "default": "slow", "next": "b"},
        "b": {"id": "b", "type": "empty_page", "next": "end"},
        "end": {"id": "end", "type": "thank_you"},
        "no": {"id": "no", "type": "no_proceed", "reason": "nope"},
    },
}


class StepTests(SimpleTestCase):
    def test_routes_to_no_proceed(self):
        self.assertEqual(engine.next_node(ROUTING, {"a": "stop"}, "a")["id"], "no")

    def test_auto_nodes_are_resolved_and_recorded(self):
        result = engine.step(ROUTING, {"a": "go", "d": "x", "st": "TX"}, "a", availability=lambda s, d: True)
        self.assertEqual(result.node["id"], "b")
        self.assertEqual(result.visited, ["zip", "phase"])
        self.assertEqual(result.auto, {"zip": {"available": True}, "phase": {"value": "fast"}})

    def test_unavailable_zip_goes_to_no_proceed(self):
        node = engine.next_node(ROUTING, {"a": "go", "d": "x", "st": "TX"}, "a", availability=lambda s, d: False)
        self.assertEqual(node["id"], "no")

    def test_zip_router_receives_state_and_drug(self):
        seen = []
        engine.next_node(ROUTING, {"a": "go", "d": "x", "st": "TX"}, "a", availability=lambda s, d: seen.append((s, d)) or True)
        self.assertEqual(seen, [("TX", "x")])

    def test_zip_router_without_checker_is_an_error(self):
        with self.assertRaises(EngineError):
            engine.next_node(ROUTING, {"a": "go", "d": "x", "st": "TX"}, "a")

    def test_default_router_value(self):
        # Answers for "a" other than "go" never reach phase in this graph; evaluate the router directly.
        result = engine._auto_result(ROUTING["nodes"]["phase"], {"a": "other"}, None)
        self.assertEqual(result, {"value": "slow"})

    def test_stored_auto_result_is_reused(self):
        answers = {"a": "go", "d": "x", "st": "TX", "zip": {"available": False}}
        self.assertEqual(engine.next_node(ROUTING, answers, "a", availability=lambda s, d: True)["id"], "no")

    def test_cannot_advance_unanswered_node(self):
        with self.assertRaises(NodeNotAnswered):
            engine.next_node(ROUTING, {}, "a")

    def test_cannot_advance_terminal_or_unknown(self):
        with self.assertRaises(EngineError):
            engine.next_node(ROUTING, {}, "end")
        with self.assertRaises(EngineError):
            engine.next_node(ROUTING, {}, "ghost")

    def test_dead_end_is_an_error(self):
        broken = {"start": "x", "nodes": {"x": {"id": "x", "type": "empty_page"}}}
        with self.assertRaises(EngineError):
            engine.next_node(broken, {"x": True}, "x")

    def test_routing_loop_is_detected(self):
        loop = {"start": "x", "nodes": {
            "x": {"id": "x", "type": "empty_page", "next": "r1"},
            "r1": {"id": "r1", "type": "answer_router", "next": "r2"},
            "r2": {"id": "r2", "type": "answer_router", "next": "r1"}}}
        with self.assertRaises(EngineError):
            engine.next_node(loop, {"x": True}, "x")

    def test_public_node_hides_routing(self):
        public = engine.public_node(ROUTING["nodes"]["a"], {})
        self.assertNotIn("routes", public)
        self.assertNotIn("next", public)
        self.assertEqual(public["options"], [{"key": "go", "label": "g"}, {"key": "stop", "label": "s"}])

    def test_public_node_filters_conditional_options_and_checkout_internals(self):
        node = {"id": "d", "type": "radio", "options": [{"key": "x", "label": "X", "when": {"ref": "m", "equals": 1}}, {"key": "y", "label": "Y"}]}
        self.assertEqual([o["key"] for o in engine.public_node(node, {"m": 2})["options"]], ["y"])
        public = engine.public_node(CHECKOUT, CHECKOUT_ANSWERS)
        self.assertEqual(public["plan_slugs"], ["starter", "m1"])
        self.assertNotIn("variants", public)
        self.assertNotIn("drug_ref", public)

    def test_progress_is_monotonic_and_bounded(self):
        start = engine.progress(ROUTING, [], "a")
        later = engine.progress(ROUTING, ["a", "zip", "phase"], "b")
        self.assertEqual(start, 0.0)
        self.assertTrue(0 < later < 1)

"""The DEV-ONLY quick_test questionnaire and its explicit `load_definitions --dev` seed."""
import io
import json
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, override_settings

from apps.catalog.models import Plan, PlanPrice, Product
from apps.questionnaires import engine
from apps.questionnaires.definition import find_errors
from apps.questionnaires.models import Questionnaire

from .flow import BASICS, FILE_ID, TODAY, everywhere

DEV_DIR = Path(settings.DEFINITIONS_DIR) / "dev"
META = ("slug", "title", "product_slug", "version_label", "layout")
RAW = json.loads((DEV_DIR / "quick_test.v2.json").read_text(encoding="utf-8"))
DEF = {k: v for k, v in RAW.items() if k not in META}

ANSWERS = {
    "goal": "health", "activity": "low", "sleep": "6_to_8h", "login_nudge": None, "auth": None, "basics": BASICS,
    "visit_type": "devtest", "visit_option": "none", "safety": True, "terms_consent": True, "telehealth_consent": True, "checkout": {"plan_slug": "dev-test-3month"},
    "medical_intro": None, "conditions": ["none"], "allergy_note": "", "id_verification": {"skipped": True},
    "truthfulness_consent": True,
}


def walk(overrides=None):
    answers = {**ANSWERS, **(overrides or {})}
    store, seen = {}, []
    node = engine.entry_node(DEF).node
    while node["type"] not in engine.TERMINAL_TYPES:
        seen.append(node["id"])
        store[node["id"]] = engine.validate_answer(node, answers[node["id"]], answers=store, today=TODAY)
        result = engine.step(DEF, store, node["id"], availability=everywhere)
        store.update(result.auto)
        node = result.node
    return node, store, seen


def call(*args):
    call_command("load_definitions", *args, stdout=io.StringIO(), stderr=io.StringIO())


class QuickTestDefinitionTests(SimpleTestCase):
    def test_validates_and_is_short(self):
        self.assertEqual(find_errors(DEF), [])
        questions = [n for n in DEF["nodes"].values() if n["type"] in ("radio", "multi_select", "text", "id_photo")]
        self.assertLessEqual(len(questions), 11)
        self.assertEqual((RAW["slug"], RAW["version_label"]), ("quick_test", "v2"))

    def test_uses_real_node_types(self):
        types = {n["type"] for n in DEF["nodes"].values()}
        self.assertTrue({"auth", "basics", "checkout", "thank_you", "no_proceed", "safety_consent", "id_photo", "multi_select", "radio"} <= types)

    def test_every_branch_ends_at_thank_you_or_no_proceed(self):
        def ends(node_id):
            node = DEF["nodes"][node_id]
            edges = engine.node_edges(node)
            if not edges:
                return {node["type"]}
            return set().union(*(ends(e) for e in edges))

        self.assertEqual(ends(DEF["start"]), {"thank_you", "no_proceed"})

    def test_walks_end_to_end(self):
        node, store, seen = walk()
        self.assertEqual(node["id"], "thank_you")
        self.assertLess(seen.index("auth"), seen.index("basics"))
        self.assertLess(seen.index("checkout"), seen.index("conditions"))
        out = engine.evaluate(DEF, store, availability=everywhere)
        self.assertTrue(out.completed)
        self.assertEqual(out.selected_variant_key, "devtest.none.maintenance")
        self.assertEqual(out.candidate_plan_slugs, ["dev-test-monthly", "dev-test-3month"])

    def test_id_photo_is_optional_but_accepts_upload(self):
        node, _, _ = walk({"id_verification": {"file_ids": [FILE_ID]}})
        self.assertEqual(node["id"], "thank_you")

    def test_under_18_is_disqualified(self):
        node, _, seen = walk({"basics": {**BASICS, "dob": "2015-01-01"}})
        self.assertEqual((node["id"], node["reason"]), ("no_proceed_age", "under_18"))
        self.assertNotIn("checkout", seen)

    def test_declined_consent_blocks(self):
        with self.assertRaises(engine.AnswerError):
            walk({"safety": False})

    def test_dev_files_have_no_em_dash(self):
        for path in DEV_DIR.iterdir():
            self.assertNotIn("\u2014", path.read_text(encoding="utf-8"), path.name)


class DevSeedTests(TestCase):
    def test_default_load_does_not_load_dev_data(self):
        call()
        self.assertFalse(Product.objects.filter(slug="dev-test-visit").exists())
        self.assertFalse(Questionnaire.objects.filter(slug="quick_test").exists())
        self.assertTrue(Questionnaire.objects.filter(slug="weight_loss").exists())

    @override_settings(DEBUG=True)
    def test_dev_flag_loads_dev_data_under_debug(self):
        call("--dev")
        product = Product.objects.get(slug="dev-test-visit")
        self.assertEqual((product.routing_mode, product.questionnaire_slug), ("network_routes", "quick_test"))
        self.assertTrue(product.neutral_label)
        monthly, quarterly = Plan.objects.get(slug="dev-test-monthly"), Plan.objects.get(slug="dev-test-3month")
        self.assertEqual((monthly.billing_commitment, monthly.term_months), ("renewing_monthly", 1))
        self.assertEqual((quarterly.billing_commitment, quarterly.term_months, quarterly.ship_interval_months), ("prepaid_term", 3, 3))
        self.assertEqual(PlanPrice.objects.get(plan=monthly).amount_cents, 100)
        self.assertEqual(PlanPrice.objects.get(plan=quarterly).amount_cents, 250)
        version = Questionnaire.objects.get(slug="quick_test").latest_published()
        self.assertEqual(version.version_label, "v2")
        from apps.routing.models import RoutingRule

        rule = RoutingRule.objects.get(product=product)
        self.assertEqual((rule.states_mode, rule.network.slug), ("all", "beluga"))
        self.assertTrue(Product.objects.filter(slug="weight-loss-glp1").exists())

    @override_settings(DEBUG=True)
    def test_dev_load_is_idempotent(self):
        call("--dev")
        call("--dev")
        self.assertEqual(Plan.objects.filter(slug__startswith="dev-test").count(), 2)
        self.assertEqual(Questionnaire.objects.get(slug="quick_test").versions.count(), 1)

    @override_settings(DEBUG=False)
    def test_dev_flag_refused_when_debug_false(self):
        with self.assertRaises(CommandError):
            call("--dev")
        self.assertFalse(Product.objects.filter(slug="dev-test-visit").exists())
        self.assertFalse(Product.objects.exists())

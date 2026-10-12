"""Structural validation: the shipped definition is sound and the validator catches broken ones."""
import copy
import json

from django.test import SimpleTestCase

from apps.questionnaires import engine
from apps.questionnaires.definition import DefinitionError, definition_hash, find_errors, validate_definition

from .flow import DEFINITION_PATH, load_definition

DEF = load_definition()
NODES = DEF["nodes"]


def ancestors(node_id):
    """All nodes that can appear before ``node_id`` on some path."""
    parents = {n: set() for n in NODES}
    for n, node in NODES.items():
        for edge in engine.node_edges(node):
            parents[edge].add(n)
    seen, stack = set(), [node_id]
    while stack:
        for parent in parents[stack.pop()]:
            if parent not in seen:
                seen.add(parent)
                stack.append(parent)
    return seen


class ShippedDefinitionTests(SimpleTestCase):
    def test_validates(self):
        self.assertEqual(find_errors(DEF), [])
        validate_definition(DEF)

    def test_no_unreachable_nodes_or_dangling_edges(self):
        reachable, stack = set(), [DEF["start"]]
        while stack:
            current = stack.pop()
            if current not in reachable:
                reachable.add(current)
                for edge in engine.node_edges(NODES[current]):
                    self.assertIn(edge, NODES)
                    stack.append(edge)
        self.assertEqual(reachable, set(NODES))

    def test_every_path_ends_at_thank_you_or_no_proceed(self):
        def walk(node_id, trail):
            node = NODES[node_id]
            self.assertNotIn(node_id, trail, "cycle")
            edges = engine.node_edges(node)
            if node["type"] in engine.TERMINAL_TYPES:
                self.assertEqual(edges, [])
                self.assertIn(node["type"], ("thank_you", "no_proceed"))
                return 1
            self.assertTrue(edges, f"{node_id} is a dead end")
            return sum(walk(edge, trail | {node_id}) for edge in edges)

        self.assertGreater(walk(DEF["start"], frozenset()), 10)

    def test_single_thank_you_and_reasons(self):
        self.assertEqual([n for n, v in NODES.items() if v["type"] == "thank_you"], ["thank_you"])
        reasons = {v["reason"] for v in NODES.values() if v["type"] == "no_proceed"}
        self.assertEqual(reasons, {"under_18", "bmi_below_minimum", "state_unavailable", "recent_gastric_bypass", "pregnancy_or_breastfeeding"})

    def test_conditions_only_read_earlier_nodes(self):
        for node_id, node in NODES.items():
            refs = set()
            for route in node.get("routes", []):
                refs |= set(engine.condition_refs(route["when"]))
            for rule in node.get("rules", []):
                refs |= set(engine.condition_refs(rule["when"]))
            for flag in node.get("flags", []):
                refs |= set(engine.condition_refs(flag["when"]))
            for option in node.get("options", []):
                refs |= set(engine.condition_refs(option.get("when")))
            refs |= set(engine.condition_refs(node.get("optional_when")))
            refs |= set(engine.condition_refs(node.get("new_user_when")))
            for ref in node_refs(node):
                refs.add(ref)
            for ref in refs:
                self.assertTrue(ref == node_id or ref in ancestors(node_id), f"{node_id} reads {ref} which may not be answered yet")

    def test_zip_router_comes_after_state_and_drug(self):
        anc = ancestors("zip_router")
        self.assertIn("basics", anc)
        self.assertIn("drug_choice", anc)
        self.assertIn("checkout", engine.node_edges(NODES["telehealth_consent"]))
        for needed in ("terms_consent", "telehealth_consent"):
            self.assertIn(needed, ancestors("checkout"))
            self.assertIn("checkout", engine.node_edges(NODES[needed]) + engine.node_edges(NODES["telehealth_consent"]))

    def test_checkout_comes_before_medical_section_and_after_choices(self):
        before = ancestors("checkout")
        for needed in ("drug_choice", "additive_semaglutide", "additive_tirzepatide", "phase_router", "bmi_consent", "basics", "auth"):
            self.assertIn(needed, before)
        for medical in ("conditions", "gastric_bypass", "id_verification", "thank_you"):
            self.assertIn("checkout", ancestors(medical))

    def test_auth_precedes_basics(self):
        self.assertIn("auth", ancestors("basics"))

    def test_bmi_minimums(self):
        self.assertEqual(NODES["bmi_current"]["min_bmi"], 20)
        self.assertEqual(NODES["bmi_new"]["min_bmi"], 25)

    def test_every_node_has_copy_and_no_em_dashes(self):
        for node_id, node in NODES.items():
            if node["type"] not in engine.AUTO_TYPES:
                self.assertTrue(node.get("title"), node_id)
        self.assertNotIn("\u2014", DEFINITION_PATH.read_text(encoding="utf-8"))

    def test_no_raw_colors_in_definition(self):
        text = DEFINITION_PATH.read_text(encoding="utf-8")
        self.assertNotRegex(text, r"#[0-9a-fA-F]{3,8}\b")
        self.assertNotIn("oklch(", text)

    def test_hash_is_stable_and_sensitive(self):
        self.assertEqual(definition_hash(DEF), definition_hash(copy.deepcopy(DEF)))
        changed = copy.deepcopy(DEF)
        changed["nodes"]["motivation"]["title"] = "Different"
        self.assertNotEqual(definition_hash(DEF), definition_hash(changed))

    def test_file_metadata(self):
        data = json.loads(DEFINITION_PATH.read_text(encoding="utf-8"))
        self.assertEqual((data["slug"], data["version_label"], data["layout"]), ("weight_loss", "v2", "default"))


def node_refs(node):
    """Node ids referenced by non-condition config (checkout and zip router)."""
    refs = []
    if node["type"] == "checkout":
        refs += [node["drug_ref"].partition(".")[0], node["phase_ref"].partition(".")[0]]
        refs += [r.partition(".")[0] for r in node["additive_refs"]]
    if node["type"] == "zip_router":
        refs += [node["drug_ref"].partition(".")[0], node["state_ref"].partition(".")[0]]
    return refs


def broken(mutator):
    data = copy.deepcopy(DEF)
    mutator(data)
    return find_errors(data)


class ValidatorCatchesProblemsTests(SimpleTestCase):
    def test_dangling_edge(self):
        errors = broken(lambda d: d["nodes"]["motivation"].update(next="ghost"))
        self.assertTrue(any("missing node ghost" in e for e in errors))

    def test_unreachable_node(self):
        def add(d):
            d["nodes"]["orphan"] = {"id": "orphan", "type": "thank_you"}
        self.assertTrue(any("orphan: unreachable" in e for e in broken(add)))

    def test_cycle(self):
        errors = broken(lambda d: d["nodes"]["sleep_note"].update(next="motivation"))
        self.assertTrue(any("cycle" in e for e in errors))

    def test_dead_end(self):
        def cut(d):
            del d["nodes"]["goal_closer"]["next"]
        self.assertTrue(any("goal_closer" in e for e in broken(cut)))

    def test_terminal_with_edges(self):
        self.assertTrue(any("terminal" in e for e in broken(lambda d: d["nodes"]["thank_you"].update(next="motivation"))))

    def test_unknown_type_and_id_mismatch(self):
        self.assertTrue(any("unknown type" in e for e in broken(lambda d: d["nodes"]["motivation"].update(type="mystery"))))
        self.assertTrue(any("id must match" in e for e in broken(lambda d: d["nodes"]["motivation"].update(id="other"))))

    def test_condition_reading_missing_node(self):
        errors = broken(lambda d: d["nodes"]["basics"]["routes"].append({"when": {"ref": "ghost", "equals": 1}, "goto": "no_proceed_age"}))
        self.assertTrue(any("missing node ghost" in e for e in errors))

    def test_bad_options(self):
        self.assertTrue(broken(lambda d: d["nodes"]["motivation"].update(options=[])))
        self.assertTrue(broken(lambda d: d["nodes"]["motivation"].update(options=[{"key": "a", "label": "A"}, {"key": "a", "label": "B"}])))

    def test_missing_start_and_shape(self):
        self.assertTrue(find_errors({"start": "x", "nodes": {}}))
        self.assertTrue(find_errors({}))
        self.assertTrue(find_errors("nope"))

    def test_bmi_and_zip_router_need_exits(self):
        self.assertTrue(broken(lambda d: d["nodes"]["bmi_new"].pop("below_min_goto")))
        self.assertTrue(broken(lambda d: d["nodes"]["zip_router"].pop("unavailable_goto")))

    def test_checkout_needs_variants(self):
        self.assertTrue(broken(lambda d: d["nodes"]["checkout"].update(variants={})))
        self.assertTrue(broken(lambda d: d["nodes"]["checkout"]["variants"].update({"bad": {"plan_slugs": []}})))

    def test_no_proceed_needs_reason(self):
        self.assertTrue(broken(lambda d: d["nodes"]["no_proceed_age"].pop("reason")))

    def test_start_cannot_be_auto(self):
        self.assertTrue(broken(lambda d: d.update(start="phase_router")))

    def test_validate_raises_with_all_errors(self):
        data = copy.deepcopy(DEF)
        data["nodes"]["motivation"]["next"] = "ghost"
        with self.assertRaises(DefinitionError) as ctx:
            validate_definition(data)
        self.assertTrue(ctx.exception.errors)

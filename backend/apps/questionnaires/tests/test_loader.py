import json
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from apps.questionnaires.definition import DefinitionError
from apps.questionnaires.loader import DefinitionChangedError, load_questionnaire_definitions
from apps.questionnaires.models import Layout, Questionnaire, QuestionnaireVersion

from .flow import DEFINITION_PATH


class LoaderTests(TestCase):
    def test_loads_layout_and_publishes(self):
        versions = load_questionnaire_definitions()
        self.assertEqual([v.version_label for v in versions], ["v1", "v2"])
        version = Questionnaire.objects.get(slug="weight_loss").latest_published()
        self.assertEqual(version.version_label, "v2")
        self.assertEqual(QuestionnaireVersion.objects.get(version_label="v1").status, "archived")
        self.assertEqual(version.layout.slug, "default")
        self.assertEqual(version.questionnaire.slug, "weight_loss")
        self.assertEqual(version.questionnaire.product_slug, "weight-loss-glp1")
        self.assertIn("shell", Layout.objects.get(slug="default").config)
        self.assertNotIn("slug", version.definition)
        self.assertNotIn("version_label", version.definition)

    def test_idempotent(self):
        load_questionnaire_definitions()
        load_questionnaire_definitions()
        self.assertEqual(QuestionnaireVersion.objects.count(), 2)
        self.assertEqual(Questionnaire.objects.count(), 1)

    def test_changed_published_definition_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "questionnaires").mkdir()
            (base / "layouts").mkdir()
            data = json.loads(DEFINITION_PATH.read_text(encoding="utf-8"))
            data["layout"] = ""
            path = base / "questionnaires" / "x.json"
            path.write_text(json.dumps(data))
            load_questionnaire_definitions(base)
            data["nodes"]["motivation"]["title"] = "Changed"
            path.write_text(json.dumps(data))
            with self.assertRaises(DefinitionChangedError):
                load_questionnaire_definitions(base)
            data["version_label"] = "v3"
            path.write_text(json.dumps(data))
            load_questionnaire_definitions(base)
            self.assertEqual(QuestionnaireVersion.objects.get(version_label="v2").status, "archived")
            self.assertEqual(QuestionnaireVersion.objects.get(version_label="v3").status, "published")

    def test_invalid_file_is_refused_with_filename(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "questionnaires").mkdir()
            data = json.loads(DEFINITION_PATH.read_text(encoding="utf-8"))
            data["layout"] = ""
            data["nodes"]["motivation"]["next"] = "ghost"
            (base / "questionnaires" / "bad.json").write_text(json.dumps(data))
            with self.assertRaises(DefinitionError) as ctx:
                load_questionnaire_definitions(base)
            self.assertIn("bad.json", str(ctx.exception))
            self.assertEqual(QuestionnaireVersion.objects.count(), 0)

    def test_missing_layout_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "questionnaires").mkdir()
            data = json.loads(DEFINITION_PATH.read_text(encoding="utf-8"))
            data["layout"] = "nope"
            (base / "questionnaires" / "x.json").write_text(json.dumps(data))
            with self.assertRaises(DefinitionError):
                load_questionnaire_definitions(base)

    def test_draft_with_same_label_is_overwritten_and_published(self):
        load_questionnaire_definitions()
        QuestionnaireVersion.objects.all().delete()
        questionnaire = Questionnaire.objects.get()
        QuestionnaireVersion.objects.create(questionnaire=questionnaire, version_label="v1", definition={"stale": True})
        load_questionnaire_definitions()
        v1 = QuestionnaireVersion.objects.get(version_label="v1")
        self.assertIn("nodes", v1.definition)
        self.assertEqual(v1.status, "archived")
        self.assertEqual(Questionnaire.objects.get().latest_published().version_label, "v2")

    def test_management_command(self):
        call_command("load_questionnaires", stdout=open("/dev/null", "w"))
        self.assertEqual(QuestionnaireVersion.objects.filter(status="published").count(), 1)
        self.assertEqual(QuestionnaireVersion.objects.filter(status="archived").count(), 1)

    def test_registered_with_catalog_loader(self):
        from apps.catalog.loader import get_loaders

        self.assertIn("questionnaires", get_loaders())

    def test_default_layout_uses_tokens_only(self):
        load_questionnaire_definitions()
        text = json.dumps(Layout.objects.get(slug="default").config)
        self.assertNotRegex(text, r"#[0-9a-fA-F]{3,8}\b")
        self.assertNotIn("\u2014", text)
        for token in Layout.objects.get(slug="default").config["colors"].values():
            self.assertIn(token, ("background", "card", "foreground", "border", "primary", "accent", "success", "warning", "destructive"))

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.questionnaires.definition import DefinitionError
from apps.questionnaires.models import (
    ImmutableVersionError,
    Layout,
    Questionnaire,
    QuestionnaireVersion,
    Submission,
    hash_token,
    new_token,
)
from apps.questionnaires.services import duplicate_version

from .flow import load_definition

Status = QuestionnaireVersion.Status


def make_version(label="v1", definition=None, status=Status.DRAFT, questionnaire=None):
    questionnaire = questionnaire or Questionnaire.objects.get_or_create(slug="wl", defaults={"title": "WL"})[0]
    return QuestionnaireVersion.objects.create(
        questionnaire=questionnaire, version_label=label, definition=definition if definition is not None else load_definition(), status=status
    )


class VersionImmutabilityTests(TestCase):
    def test_draft_is_editable(self):
        version = make_version()
        version.definition = {"changed": True}
        version.version_label = "v9"
        version.save()
        version.refresh_from_db()
        self.assertEqual(version.version_label, "v9")

    def test_publish_sets_hash_and_timestamp(self):
        version = make_version()
        version.publish()
        version.refresh_from_db()
        self.assertEqual(version.status, Status.PUBLISHED)
        self.assertEqual(len(version.definition_hash), 64)
        self.assertIsNotNone(version.published_at)

    def test_published_definition_cannot_change(self):
        version = make_version()
        version.publish()
        version.definition["nodes"]["motivation"]["title"] = "Hacked"
        with self.assertRaises(ImmutableVersionError):
            version.save()
        version.refresh_from_db()
        self.assertNotEqual(version.definition["nodes"]["motivation"]["title"], "Hacked")

    def test_published_fields_cannot_change(self):
        version = make_version()
        version.publish()
        for field, value in (("version_label", "other"), ("definition_hash", "x" * 64), ("published_at", None)):
            fresh = QuestionnaireVersion.objects.get(pk=version.pk)
            setattr(fresh, field, value)
            with self.assertRaises(ImmutableVersionError, msg=field):
                fresh.save()
        fresh = QuestionnaireVersion.objects.get(pk=version.pk)
        fresh.layout = Layout.objects.create(slug="other", name="Other")
        with self.assertRaises(ImmutableVersionError):
            fresh.save()

    def test_published_cannot_go_back_to_draft(self):
        version = make_version()
        version.publish()
        version.status = Status.DRAFT
        with self.assertRaises(ImmutableVersionError):
            version.save()

    def test_published_can_be_archived_and_archived_is_frozen(self):
        version = make_version()
        version.publish()
        version.status = Status.ARCHIVED
        version.save()
        version.status = Status.PUBLISHED
        with self.assertRaises(ImmutableVersionError):
            version.save()
        version.refresh_from_db()
        version.definition = {}
        with self.assertRaises(ImmutableVersionError):
            version.save()

    def test_only_drafts_delete_or_publish(self):
        version = make_version()
        version.publish()
        with self.assertRaises(ImmutableVersionError):
            version.delete()
        with self.assertRaises(ImmutableVersionError):
            version.publish()
        draft = make_version("v2")
        draft.delete()
        self.assertFalse(QuestionnaireVersion.objects.filter(version_label="v2").exists())

    def test_publish_rejects_invalid_definition(self):
        version = make_version(definition={"start": "a", "nodes": {"a": {"id": "a", "type": "empty_page", "next": "ghost"}}})
        with self.assertRaises(DefinitionError):
            version.publish()
        version.refresh_from_db()
        self.assertEqual(version.status, Status.DRAFT)

    def test_publishing_archives_previous_published(self):
        first = make_version("v1")
        first.publish()
        second = make_version("v2", questionnaire=first.questionnaire)
        second.publish()
        first.refresh_from_db()
        self.assertEqual(first.status, Status.ARCHIVED)
        self.assertEqual(first.questionnaire.latest_published().pk, second.pk)

    def test_version_label_unique_per_questionnaire(self):
        make_version("v1")
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_version("v1")

    def test_duplicate_creates_independent_draft(self):
        version = make_version()
        version.publish()
        copy = duplicate_version(version)
        self.assertEqual((copy.status, copy.version_label), (Status.DRAFT, "v2"))
        self.assertEqual(copy.definition, version.definition)
        copy.definition["nodes"]["motivation"]["title"] = "Edited"
        copy.save()
        version.refresh_from_db()
        self.assertNotEqual(version.definition["nodes"]["motivation"]["title"], "Edited")
        self.assertEqual(duplicate_version(version).version_label, "v3")
        self.assertEqual(duplicate_version(version, "custom").version_label, "custom")

    def test_str_has_no_phi(self):
        version = make_version()
        self.assertIn("wl", str(version))
        self.assertIn("wl", str(version.questionnaire))
        self.assertIn("Layout", str(Layout(slug="x", name="X")))


class TokenTests(TestCase):
    def test_tokens_are_random_and_hashed(self):
        a, b = new_token(), new_token()
        self.assertNotEqual(a, b)
        self.assertGreaterEqual(len(a), 40)
        self.assertEqual(len(hash_token(a)), 64)
        self.assertNotEqual(hash_token(a), a)

    def test_submission_str_has_only_id_and_status(self):
        sub = Submission(status="in_progress")
        self.assertNotIn("@", str(sub))

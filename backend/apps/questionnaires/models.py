from __future__ import annotations

import hashlib
import secrets
from typing import Any

from django.db import models, transaction
from django.utils import timezone

from apps.common.crypto import EncryptedJSONField
from apps.common.models import BaseModel

from .definition import definition_hash, validate_definition


class ImmutableVersionError(Exception):
    """A published or archived questionnaire version cannot be changed."""


class Questionnaire(BaseModel):
    """A named questionnaire (for example weight loss). Versions hold the actual flow."""

    slug = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=200)
    product_slug = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        ordering = ["slug"]

    def __str__(self) -> str:
        return f"Questionnaire {self.slug}"

    def latest_published(self) -> "QuestionnaireVersion | None":
        """The version new patients start on."""
        return self.versions.filter(status=QuestionnaireVersion.Status.PUBLISHED).order_by("-published_at").first()


class Layout(BaseModel):
    """Global shell shared by questionnaires: progress style, header, footer, tokens, copy slots."""

    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=200)
    config = models.JSONField(default=dict, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["slug"]

    def __str__(self) -> str:
        return f"Layout {self.slug}"


class QuestionnaireVersion(BaseModel):
    """One version of a flow graph. Immutable once published."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.PROTECT, related_name="versions")
    version_label = models.CharField(max_length=32)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    definition = models.JSONField(default=dict, blank=True)
    definition_hash = models.CharField(max_length=64, blank=True)
    layout = models.ForeignKey(Layout, null=True, blank=True, on_delete=models.PROTECT, related_name="versions")
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["questionnaire__slug", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["questionnaire", "version_label"], name="uniq_questionnaire_version_label"),
        ]

    # Fields frozen once a version leaves draft. Only the status may move published -> archived.
    _FROZEN = ("questionnaire_id", "version_label", "definition", "definition_hash", "layout_id", "published_at")

    def __str__(self) -> str:
        return f"{self.questionnaire.slug} {self.version_label} ({self.status})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self._state.adding:
            stored = type(self).objects.filter(pk=self.pk).values("status", *self._FROZEN).first()
            if stored and stored["status"] != self.Status.DRAFT:
                self._guard_frozen(stored)
        super().save(*args, **kwargs)

    def _guard_frozen(self, stored: dict[str, Any]) -> None:
        if any(getattr(self, name) != stored[name] for name in self._FROZEN):
            raise ImmutableVersionError("Published versions cannot be edited. Duplicate to a draft instead.")
        allowed = {
            self.Status.PUBLISHED: {self.Status.PUBLISHED, self.Status.ARCHIVED},
            self.Status.ARCHIVED: {self.Status.ARCHIVED},
        }[stored["status"]]
        if self.status not in allowed:
            raise ImmutableVersionError("A published version can only be archived.")

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        if self.status != self.Status.DRAFT:
            raise ImmutableVersionError("Only draft versions can be deleted.")
        return super().delete(*args, **kwargs)

    def publish(self) -> None:
        """Validate, hash and publish a draft. Archives the questionnaire's previous published version."""
        if self.status != self.Status.DRAFT:
            raise ImmutableVersionError("Only drafts can be published.")
        validate_definition(self.definition)
        self.definition_hash = definition_hash(self.definition)
        self.status = self.Status.PUBLISHED
        self.published_at = timezone.now()
        with transaction.atomic():
            for old in type(self).objects.filter(questionnaire=self.questionnaire, status=self.Status.PUBLISHED).exclude(pk=self.pk):
                old.status = self.Status.ARCHIVED
                old.save()
            self.save()


def hash_token(raw: str) -> str:
    """Anonymous tokens are stored only as a SHA-256 digest."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def new_token() -> str:
    """A fresh unguessable anonymous token (sent once as an HttpOnly cookie)."""
    return secrets.token_urlsafe(32)


class Submission(BaseModel):
    """One patient's walk through a pinned questionnaire version."""

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        SUBMITTED = "submitted", "Submitted"
        DISQUALIFIED = "disqualified", "Disqualified"
        ABANDONED = "abandoned", "Abandoned"

    patient = models.ForeignKey("patients.PatientProfile", null=True, blank=True, on_delete=models.PROTECT, related_name="submissions")
    anonymous_token = models.CharField(
        max_length=64, blank=True, db_index=True, help_text="SHA-256 of the cookie token. Cleared when claimed."
    )
    version = models.ForeignKey(QuestionnaireVersion, on_delete=models.PROTECT, related_name="submissions")
    status = models.CharField(max_length=14, choices=Status.choices, default=Status.IN_PROGRESS, db_index=True)
    answers = EncryptedJSONField(default=dict, blank=True)
    current_node = models.CharField(max_length=80, blank=True)
    path = models.JSONField(default=list, blank=True)
    outcome = models.JSONField(default=dict, blank=True)
    selected_plan = models.ForeignKey("catalog.Plan", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    started_at = models.DateTimeField(default=timezone.now)
    account_created_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    utm = models.JSONField(default=dict, blank=True)
    last_activity_at = models.DateTimeField(default=timezone.now, db_index=True)

    def __str__(self) -> str:
        return f"Submission {self.id} ({self.status})"


class SubmissionFile(BaseModel):
    """An uploaded document (ID photo, GLP-1 proof) stored in S3. Never the bytes themselves."""

    class Kind(models.TextChoices):
        ID_PHOTO = "id_photo", "ID photo"
        GLP1_PROOF = "glp1_proof", "GLP-1 proof"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending upload"
        UPLOADED = "uploaded", "Uploaded"
        REJECTED = "rejected", "Rejected"

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="files")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    s3_key = models.CharField(max_length=300)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"SubmissionFile {self.id} ({self.kind})"

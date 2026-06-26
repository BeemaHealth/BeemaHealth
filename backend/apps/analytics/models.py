import re
import uuid

from django.db import models

from apps.accounts.models import User
from apps.eligibility.models import FunnelSession


ALLOWED_EVENT_NAMES = frozenset(
    {
        "step_viewed",
        "step_completed",
        "account_created",
        "intake_submitted",
        "consent_signed",
        "funnel_abandoned",
        "page_viewed",
        "page_reloaded",
        "cta_clicked",
    }
)

ALLOWED_PROPERTY_KEYS = frozenset(
    {
        "duration_ms",
        "step_index",
        "total_steps",
        "error_code",
        "page",
        "landing_page_slug",
        "referrer",
        "cta_id",
    }
)

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


class LandingPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    headline = models.CharField(max_length=256, blank=True, default="")
    subheadline = models.CharField(max_length=512, blank=True, default="")
    utm_source = models.CharField(max_length=128, blank=True, default="")
    utm_medium = models.CharField(max_length=128, blank=True, default="")
    utm_campaign = models.CharField(max_length=128, blank=True, default="")
    utm_content = models.CharField(max_length=128, blank=True, default="")
    redirect_to_home = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "landing_pages"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.slug})"


class FunnelEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_name = models.CharField(max_length=64, db_index=True)
    funnel_session = models.ForeignKey(
        FunnelSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="funnel_events",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="funnel_events",
    )
    questionnaire_slug = models.CharField(max_length=32, blank=True, default="")
    questionnaire_version_id = models.UUIDField(null=True, blank=True)
    step_key = models.CharField(max_length=64, blank=True, default="")
    experiment_id = models.UUIDField(null=True, blank=True)
    variant_key = models.CharField(max_length=32, blank=True, default="")
    properties = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "funnel_events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["questionnaire_slug", "step_key", "created_at"]),
            models.Index(fields=["experiment_id", "variant_key"]),
        ]

    def __str__(self):
        return f"{self.event_name} @ {self.created_at}"

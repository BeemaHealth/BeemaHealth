from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import models

from apps.common.models import BaseModel


class AuditImmutableError(Exception):
    """Raised when code tries to change or delete an audit event."""


class AuditQuerySet(models.QuerySet["AuditEvent"]):
    def update(self, **kwargs: Any) -> int:
        raise AuditImmutableError("Audit events are append only.")

    def delete(self) -> tuple[int, dict[str, int]]:
        raise AuditImmutableError("Audit events are append only.")


class AuditEvent(BaseModel):
    """Append only record of who touched what. Never store PHI values in metadata."""

    class Action(models.TextChoices):
        READ = "read", "Read"
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        EXPORT = "export", "Export"
        BREAK_GLASS = "break_glass", "Break glass"
        WEBHOOK = "webhook", "Webhook"

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    actor_label = models.CharField(max_length=100, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    object_type = models.CharField(max_length=100, blank=True, db_index=True)
    object_id = models.CharField(max_length=64, blank=True)
    patient_id = models.UUIDField(null=True, blank=True, db_index=True)
    reason = models.CharField(max_length=500, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    objects = AuditQuerySet.as_manager()

    def __str__(self) -> str:
        return f"AuditEvent {self.id} ({self.action} {self.object_type})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self._state.adding:
            raise AuditImmutableError("Audit events are append only.")
        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        raise AuditImmutableError("Audit events are append only.")

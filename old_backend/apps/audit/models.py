import uuid

from django.db import models

from apps.accounts.models import User


class AuditEvent(models.Model):
    ACTION_CHOICES = [
        ("read", "Read"),
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("login", "Login"),
        ("logout", "Logout"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=64)
    resource_id = models.CharField(max_length=64)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.action} {self.resource_type}:{self.resource_id}"

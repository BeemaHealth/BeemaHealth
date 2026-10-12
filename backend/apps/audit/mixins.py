"""Admin helper that audit-logs PHI views."""
from __future__ import annotations

from typing import Any

from django.http import HttpRequest, HttpResponse


class AuditedAdminMixin:
    """Logs a ``read`` audit event whenever an admin opens a PHI object's change page."""

    def change_view(self, request: HttpRequest, object_id: str, form_url: str = "", extra_context: Any = None) -> HttpResponse:
        from .services import log

        obj = self.get_object(request, object_id)  # type: ignore[attr-defined]
        if obj is not None:
            log(request, "read", obj, metadata={"surface": "admin"})
        return super().change_view(request, object_id, form_url, extra_context)  # type: ignore[misc]

"""DRF mixin that audit-logs reads and writes of PHI objects."""
from __future__ import annotations

from typing import Any

from rest_framework.request import Request
from rest_framework.response import Response

from .services import log


class AuditedViewMixin:
    """Mix into a generic DRF view. Logs retrieve, list, create, update, and delete.

    Lists log one ``read`` event with the row count, not one per row.
    """

    audit_object_type: str = ""

    def audit(self, action: str, obj: Any = None, **kwargs: Any) -> None:
        """Log an action for the current request."""
        log(self.request, action, obj, **kwargs)  # type: ignore[attr-defined]

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        response = super().retrieve(request, *args, **kwargs)  # type: ignore[misc]
        self.audit("read", self.get_object())  # type: ignore[attr-defined]
        return response

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        response = super().list(request, *args, **kwargs)  # type: ignore[misc]
        model = self.get_queryset().model  # type: ignore[attr-defined]
        data = response.data
        count = len(data["results"]) if isinstance(data, dict) and "results" in data else len(data)
        log(request, "read", None, metadata={"object_type": model._meta.label_lower, "count": count})
        return response

    def perform_create(self, serializer: Any) -> None:
        super().perform_create(serializer)  # type: ignore[misc]
        self.audit("create", serializer.instance)

    def perform_update(self, serializer: Any) -> None:
        super().perform_update(serializer)  # type: ignore[misc]
        self.audit("update", serializer.instance, metadata={"fields": sorted(serializer.validated_data.keys())})

    def perform_destroy(self, instance: Any) -> None:
        self.audit("delete", instance)
        super().perform_destroy(instance)  # type: ignore[misc]

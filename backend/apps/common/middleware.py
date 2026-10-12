"""Request level safeguards."""
from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse


class RequestBodyLimitMiddleware:
    """Reject oversized bodies before DRF reads them (Django only caps ``request.body``)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        limit = int(getattr(settings, "REQUEST_BODY_MAX_BYTES", 2_000_000))
        declared = request.META.get("CONTENT_LENGTH") or "0"
        if declared.isdigit() and int(declared) > limit:
            return JsonResponse({"detail": "Request body too large."}, status=413)
        return self.get_response(request)

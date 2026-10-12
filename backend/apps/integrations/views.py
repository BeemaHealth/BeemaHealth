"""Webhook endpoints. Plain Django views: CSRF exempt, no session auth, no DRF throttling.

Auth failures get 401 and oversized bodies 413 (nothing stored). Anything that authenticates
and persists gets 200, even if the payload is garbage, so vendors never retry-storm us.
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.integrations import webhooks
from apps.integrations.exceptions import WebhookAuthError, WebhookTooLarge, safe_location

logger = logging.getLogger(__name__)


def _headers(request: HttpRequest) -> dict[str, str]:
    return {k: v for k, v in request.headers.items()}


def _handle(request: HttpRequest, vendor: str) -> HttpResponse:
    cap = webhooks.max_body_bytes()
    declared = request.META.get("CONTENT_LENGTH") or "0"
    if declared.isdigit() and int(declared) > cap:
        return JsonResponse({"ok": False}, status=413)
    raw_body = request.read(cap + 1)
    try:
        event = webhooks.ingest(vendor, _headers(request), raw_body)
    except WebhookTooLarge:
        return JsonResponse({"ok": False}, status=413)
    except WebhookAuthError:
        logger.warning("webhook auth failed vendor=%s", vendor)
        return JsonResponse({"ok": False}, status=401)
    except Exception as exc:  # noqa: BLE001 - not stored, so a non-200 lets the vendor retry
        logger.error("webhook persist failed vendor=%s error=%s", vendor, safe_location(exc))
        return JsonResponse({"ok": False}, status=500)
    if getattr(settings, "INTEGRATIONS_PROCESS_INLINE", False) and event.status == "received":
        webhooks.process(event)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_POST
def beluga_webhook(request: HttpRequest) -> HttpResponse:
    return _handle(request, "beluga")


@csrf_exempt
@require_POST
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    return _handle(request, "stripe")


@csrf_exempt
@require_POST
def lifefile_webhook(request: HttpRequest) -> HttpResponse:
    return _handle(request, "lifefile")

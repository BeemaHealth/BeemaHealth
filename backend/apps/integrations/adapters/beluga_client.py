"""
Beluga Health outbound API client.

Every call is logged with a request_id for correlation. No PHI in log lines —
only IDs, endpoint names, and status codes.

All functions return a result dict. When env vars are missing / not configured,
they return {"status": "not_configured", ...} and log a warning instead of
raising — so dev/test environments work without real Beluga credentials.
"""

import base64
import json
import logging
import uuid
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 20  # seconds


def _api_key() -> str:
    return getattr(settings, "BELUGA_API_KEY", "")


def _base_url() -> str:
    return getattr(settings, "BELUGA_BASE_URL", "").rstrip("/")


def _is_configured() -> bool:
    return bool(_api_key() and _base_url())


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
    }


def _post(path: str, body: dict, *, request_id: str) -> dict:
    """POST to Beluga, return parsed JSON response dict with 'status' key."""
    if not _is_configured():
        logger.warning(
            "[BELUGA OUTBOUND] not_configured request_id=%s path=%s",
            request_id,
            path,
        )
        return {"status": "not_configured", "request_id": request_id}

    url = f"{_base_url()}/{path.lstrip('/')}"
    payload = json.dumps(body).encode()
    req = Request(url, data=payload, method="POST", headers=_headers())

    logger.info(
        "[BELUGA OUTBOUND] request request_id=%s path=%s",
        request_id,
        path,
    )
    try:
        with urlopen(req, timeout=_TIMEOUT) as resp:
            raw = resp.read().decode()
            result = json.loads(raw) if raw else {}
            logger.info(
                "[BELUGA OUTBOUND] response request_id=%s path=%s http_status=%s beluga_status=%s",
                request_id,
                path,
                resp.status,
                result.get("status", "?"),
            )
            return result
    except HTTPError as exc:
        raw = exc.read().decode() if exc.fp else ""
        logger.error(
            "[BELUGA OUTBOUND] http_error request_id=%s path=%s http_status=%s body=%.200s",
            request_id,
            path,
            exc.code,
            raw,
        )
        try:
            return json.loads(raw)
        except Exception:
            return {"status": "error", "http_status": exc.code, "request_id": request_id}
    except URLError as exc:
        logger.error(
            "[BELUGA OUTBOUND] url_error request_id=%s path=%s reason=%s",
            request_id,
            path,
            str(exc.reason),
        )
        return {"status": "connection_error", "request_id": request_id}


def trigger_same_dose_refill(
    *,
    master_id: str,
    med_id: str,
    pharmacy_id: str,
) -> dict[str, Any]:
    """
    Call Beluga Trigger Refill endpoint for a same-dose refill.
    Possible statuses: NEW_RX_SENT, RX_TIME_OUT_OF_RANGE, NO_MORE_REFILLS,
    NO_VISIT, RX_MISMATCH, INCORRECT_PHARMACY_INTEGRATION, RX_ERROR, GENERIC.
    """
    request_id = str(uuid.uuid4())
    path = getattr(settings, "BELUGA_REFILL_ENDPOINT", "")
    if not path:
        logger.warning(
            "[BELUGA OUTBOUND] refill_endpoint_not_set request_id=%s master_id=%.8s",
            request_id,
            master_id,
        )
        return {"status": "not_configured", "request_id": request_id}

    body: dict[str, Any] = {
        "masterId": master_id,
        "patientPreference": [{"medId": med_id}],
    }
    if pharmacy_id:
        body["pharmacyId"] = pharmacy_id

    return _post(path, body, request_id=request_id)


def submit_titration_checkin(
    *,
    master_id: str,
    form_obj: dict[str, Any],
    visit_type: str,
    company: str,
    pharmacy_id: str = "",
) -> dict[str, Any]:
    """
    Submit a weightlossCheckin (or equivalent) visit to Beluga for provider review.
    Returns Beluga's response with visitId for subsequent photo submission.
    Possible response: { status: 200, data: { masterId, visitId } } on success.
    """
    request_id = str(uuid.uuid4())
    path = getattr(settings, "BELUGA_CREATION_PATH", "")
    if not path or not visit_type:
        logger.warning(
            "[BELUGA OUTBOUND] checkin_not_configured request_id=%s master_id=%.8s",
            request_id,
            master_id,
        )
        return {"status": "not_configured", "request_id": request_id}

    body: dict[str, Any] = {
        "formObj": form_obj,
        "masterId": master_id,
        "visitType": visit_type,
        "company": company,
    }
    if pharmacy_id:
        body["pharmacyId"] = pharmacy_id

    return _post(path, body, request_id=request_id)


def submit_photo(
    *,
    visit_id: str,
    jpeg_bytes: bytes,
) -> dict[str, Any]:
    """
    Submit a JPEG photo to Beluga (e.g., patient on scale for GLP-1 check-in).
    Pre-processes: base64-encodes; caller is responsible for JPEG conversion/resizing.
    """
    request_id = str(uuid.uuid4())
    path = getattr(settings, "BELUGA_PHOTO_ENDPOINT", "")
    if not path:
        logger.warning(
            "[BELUGA OUTBOUND] photo_endpoint_not_set request_id=%s visit_id=%.8s",
            request_id,
            visit_id,
        )
        return {"status": "not_configured", "request_id": request_id}

    encoded = base64.b64encode(jpeg_bytes).decode()
    body = {
        "visitId": visit_id,
        "images": [{"mime": "image/jpeg", "data": encoded}],
    }
    logger.info(
        "[BELUGA OUTBOUND] photo_submit request_id=%s visit_id=%.8s bytes=%d",
        request_id,
        visit_id,
        len(jpeg_bytes),
    )
    return _post(path, body, request_id=request_id)

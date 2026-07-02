"""
Beluga Health outbound API client.

Every call is logged with a request_id for correlation. No PHI in log lines —
only IDs, endpoint names, and status codes. Full (redacted) payload previews
are dev-only, via dev_log() — see _redact_beluga_body().

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

from apps.common.dev_logging import dev_log

logger = logging.getLogger(__name__)

_TIMEOUT = 20  # seconds

_REDACTED = "<redacted>"

# Structural / clinical-catalog fields that are safe to show in dev logs —
# everything else defaults to redacted (allow-list, not deny-list, so a new
# PHI-bearing field added later doesn't leak by omission).
_SAFE_KEYS = {
    "masterId",
    "medId",
    "pharmacyId",
    "visitId",
    "visitType",
    "company",
    "quantity",
    "refills",
    "daysSupply",
    "strength",
    "name",
    "consentsSigned",
    "patientVerified",
    "titration",
    "BMI",
    "titrationLevel",
    "orderId",
    "mime",
}

# Explicit PHI fields — always redacted even if a future allow-list edit
# would otherwise let them through.
_PHI_KEYS = {
    "firstName",
    "lastName",
    "email",
    "dob",
    "phone",
    "address",
    "city",
    "zip",
    "state",
    "sex",
    "selfReportedMeds",
    "allergies",
    "medicalConditions",
    "weight",
    "bmi",
    "heightFt",
    "heightIn",
    "notes",
    "content",
    "data",
    "verificationId",
}


def _redact_beluga_body(value: Any) -> Any:
    """Recursively redact PHI-bearing leaf values from a Beluga request body."""
    if isinstance(value, dict):
        result = {}
        for key, val in value.items():
            if key in _PHI_KEYS:
                result[key] = _REDACTED
            elif len(key) >= 2 and key[0] == "A" and key[1:].isdigit():
                # Free-text answer fields (A1, A2, ...) may contain patient text.
                result[key] = _REDACTED
            elif isinstance(val, (dict, list)):
                result[key] = _redact_beluga_body(val)
            elif key in _SAFE_KEYS or (len(key) >= 2 and key[0] == "Q" and key[1:].isdigit()):
                result[key] = val
            else:
                result[key] = _REDACTED
        return result
    if isinstance(value, list):
        return [_redact_beluga_body(v) for v in value]
    return value


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


def _target_url(path: str) -> str:
    """Best-effort destination URL for logging, even when half-configured."""
    if not path:
        return "<endpoint path not configured>"
    base = _base_url()
    if not base:
        return f"<BELUGA_BASE_URL not configured>/{path.lstrip('/')}"
    return f"{base}/{path.lstrip('/')}"


def _log_would_send(request_id: str, path: str, body: dict) -> None:
    """Log exactly once per outbound attempt where and what would be sent.

    Called from the single point that actually decides the call can't go out
    (either the caller's path-unset check or _post's not-configured check) so
    a half-configured env doesn't produce two log lines for one attempt.
    """
    dev_log(
        logger,
        "[BELUGA OUTBOUND MOCK] would_send request_id=%s url=%s body=%s",
        request_id,
        _target_url(path),
        _redact_beluga_body(body),
    )


def _post(path: str, body: dict, *, request_id: str) -> dict:
    """POST to Beluga, return parsed JSON response dict with 'status' key."""
    if not _is_configured():
        _log_would_send(request_id, path, body)
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
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = None
        logger.error(
            "[BELUGA OUTBOUND] http_error request_id=%s path=%s http_status=%s error=%s",
            request_id,
            path,
            exc.code,
            (parsed or {}).get("error", "<non-JSON error body>") if parsed else "<non-JSON error body>",
        )
        if parsed is not None:
            return parsed
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

    body: dict[str, Any] = {
        "masterId": master_id,
        "patientPreference": [{"medId": med_id}],
    }
    if pharmacy_id:
        body["pharmacyId"] = pharmacy_id

    if not path:
        _log_would_send(request_id, path, body)
        logger.warning(
            "[BELUGA OUTBOUND] refill_endpoint_not_set request_id=%s master_id=%.8s",
            request_id,
            master_id,
        )
        return {"status": "not_configured", "request_id": request_id}

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

    body: dict[str, Any] = {
        "formObj": form_obj,
        "masterId": master_id,
        "visitType": visit_type,
        "company": company,
    }
    if pharmacy_id:
        body["pharmacyId"] = pharmacy_id

    if not path or not visit_type:
        _log_would_send(request_id, path, body)
        logger.warning(
            "[BELUGA OUTBOUND] checkin_not_configured request_id=%s master_id=%.8s",
            request_id,
            master_id,
        )
        return {"status": "not_configured", "request_id": request_id}

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

    encoded = base64.b64encode(jpeg_bytes).decode()
    body = {
        "visitId": visit_id,
        "images": [{"mime": "image/jpeg", "data": encoded}],
    }

    if not path:
        _log_would_send(request_id, path, body)
        logger.warning(
            "[BELUGA OUTBOUND] photo_endpoint_not_set request_id=%s visit_id=%.8s",
            request_id,
            visit_id,
        )
        return {"status": "not_configured", "request_id": request_id}

    logger.info(
        "[BELUGA OUTBOUND] photo_submit request_id=%s visit_id=%.8s bytes=%d",
        request_id,
        visit_id,
        len(jpeg_bytes),
    )
    return _post(path, body, request_id=request_id)

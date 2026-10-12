"""Pharmacy adapters. LifeFile is live only behind ``settings.BEEMA_PHARMACY_ROUTING_ENABLED``.

Mapping ports ``old_backend/apps/pharmacy`` and ``docs/vendor/LIFEFILE_MEDIVERA_API.md``. Request
bodies are never logged; each call writes one redacted ``OutboundCall``.
"""
from __future__ import annotations

import base64
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings
from django.utils import timezone

from apps.integrations.exceptions import IntegrationError, NotConfigured, PayloadInvalid

TIMEOUT_SECONDS = 30
GENDER_MAP = {"female": "f", "male": "m"}
LIMITS = {"name": 30, "address": 60, "city": 100, "email": 100, "reference": 200, "memo": 120}


class PharmacyRoutingDisabled(IntegrationError):
    """Beema side pharmacy routing is switched off by feature flag."""


@dataclass
class PharmacySubmitResult:
    ok: bool
    external_order_id: str = ""
    error: str = ""


@dataclass
class PharmacyCancelResult:
    ok: bool
    error: str = ""


@dataclass
class PharmacyWebhookResult:
    external_order_id: str
    reference_id: str
    event_type: str
    status: str
    tracking_number: str
    carrier: str


class PharmacyAdapter(ABC):
    """A pharmacy that Beema routes prescriptions to."""

    vendor: str

    @abstractmethod
    def submit_order(self, order: Any) -> PharmacySubmitResult:
        """Send a fulfillment ``Order`` to the pharmacy."""

    @abstractmethod
    def cancel_order(self, order: Any) -> PharmacyCancelResult:
        """Ask the pharmacy to cancel an order that has not shipped."""

    @abstractmethod
    def handle_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        """Normalize an inbound pharmacy webhook body."""


def parse_pharmacy_webhook(payload: dict[str, Any]) -> PharmacyWebhookResult:
    """Shared parser for the documented LifeFile push shape (also used by the fake)."""
    status = str(payload.get("status") or payload.get("orderStatus") or "").strip().lower()
    return PharmacyWebhookResult(
        external_order_id=str(payload.get("orderId") or payload.get("order_id") or ""),
        reference_id=str(payload.get("referenceId") or payload.get("reference_id") or ""),
        event_type=str(payload.get("eventType") or payload.get("event_type") or status),
        status=status,
        tracking_number=str(payload.get("trackingNumber") or payload.get("tracking_number") or ""),
        carrier=str(payload.get("carrier") or ""),
    )


class FakePharmacyAdapter(PharmacyAdapter):
    """In-memory adapter for tests. ``submitted`` is class level; call ``reset`` in setUp."""

    vendor = "fake"
    submitted: list[Any] = []
    canceled: list[Any] = []
    fail_next: str = ""

    @classmethod
    def reset(cls) -> None:
        cls.submitted, cls.canceled, cls.fail_next = [], [], ""

    def submit_order(self, order: Any) -> PharmacySubmitResult:
        if FakePharmacyAdapter.fail_next:
            error, FakePharmacyAdapter.fail_next = FakePharmacyAdapter.fail_next, ""
            return PharmacySubmitResult(ok=False, error=error)
        FakePharmacyAdapter.submitted.append(order.pk)
        return PharmacySubmitResult(ok=True, external_order_id=f"FAKE-{len(FakePharmacyAdapter.submitted):06d}")

    def cancel_order(self, order: Any) -> PharmacyCancelResult:
        FakePharmacyAdapter.canceled.append(order.pk)
        return PharmacyCancelResult(ok=True)

    def handle_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        return parse_pharmacy_webhook(payload)


def format_phone(value: str | None) -> str:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}" if len(digits) == 10 else ""


def _clip(value: Any, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _prune(value: Any) -> Any:
    """Drop empty optional values so LifeFile never receives blanks."""
    if isinstance(value, dict):
        pruned = {k: _prune(v) for k, v in value.items()}
        return {k: v for k, v in pruned.items() if v not in ("", None, {}, [])}
    if isinstance(value, list):
        return [_prune(v) for v in value]
    return value


class LifeFileAdapter(PharmacyAdapter):
    """MediVera / LifeFile ``POST /order`` integration."""

    vendor = "lifefile"

    def _require_enabled(self) -> None:
        if not getattr(settings, "BEEMA_PHARMACY_ROUTING_ENABLED", False):
            raise PharmacyRoutingDisabled("Pharmacy routing is disabled")

    def build_order_payload(self, order: Any, *, message_id: int | None = None) -> dict[str, Any]:
        """Map an Order to the LifeFile body. Raises ``PayloadInvalid`` (field paths only)."""
        treatment = order.treatment
        profile = treatment.patient
        user = profile.user
        prescription = order.prescription
        if prescription is None:
            raise PayloadInvalid(["prescription"])
        address = (
            profile.addresses.filter(kind__in=["shipping", "home"]).order_by("-is_default", "-created_at").first()
            or profile.addresses.first()
        )
        missing = [
            path
            for path, value in (
                ("patient.first_name", user.first_name),
                ("patient.last_name", user.last_name),
                ("patient.date_of_birth", profile.date_of_birth),
                ("patient.address", address),
                ("prescription.drug", prescription.drug),
                ("prescription.prescriber_npi", prescription.prescriber_npi),
                ("prescription.prescriber_name", prescription.prescriber_name),
            )
            if not value
        ]
        if missing:
            raise PayloadInvalid(missing)

        phone = format_phone(user.phone)
        first, last = _clip(user.first_name, LIMITS["name"]), _clip(user.last_name, LIMITS["name"])
        prescriber_name = prescription.prescriber_name.strip()
        prescriber_first, _, prescriber_last = prescriber_name.rpartition(" ")
        shipping = {
            "recipientType": "patient",
            "recipientFirstName": first,
            "recipientLastName": last,
            "recipientPhone": phone,
            "recipientEmail": _clip(user.email, LIMITS["email"]),
            "addressLine1": _clip(address.line1, LIMITS["address"]),
            "addressLine2": _clip(address.line2, LIMITS["address"]),
            "city": _clip(address.city, LIMITS["city"]),
            "state": address.state,
            "zipCode": address.zip_code,
            "country": "US",
            "service": int(getattr(settings, "LIFEFILE_SHIPPING_SERVICE", 0)),
            "handlingService": int(getattr(settings, "LIFEFILE_HANDLING_SERVICE", 0)),
        }
        plan = treatment.plan
        rx: dict[str, Any] = {
            "rxType": "refill" if order.fill_type == "refill" else "new",
            "drugName": _clip(prescription.drug, 254),
            "drugStrength": _clip(prescription.strength, 254),
            "quantity": str(prescription.quantity) if prescription.quantity else "",
            "refills": prescription.refills,
            "daysSupply": plan.supply_days_per_shipment if plan is not None else "",
            "dateWritten": (prescription.written_at or timezone.now()).date().isoformat(),
            "scheduleCode": "0",
            "uuid": str(prescription.pk),
        }
        product_id = self._lf_product_id(treatment, order.pharmacy)
        if product_id is not None:
            rx["lfProductID"] = product_id
        clinical_rows = [
            {"type": "allergy", "code": "PATIENT_REPORTED", "description": a.name, "reaction": a.reaction, "source": "Patient"}
            for a in profile.allergies.all()
        ] + [
            {"type": "medication", "code": "PATIENT_REPORTED", "description": m.name, "source": "Patient"}
            for m in profile.medications.filter(is_current=True)
        ]
        payload = {
            "message": {"id": message_id or time.time_ns() // 1_000_000, "sentTime": timezone.now().isoformat()},
            "order": {
                "general": {"referenceId": str(order.pk), "memo": "Beema Health weight management"},
                "prescriber": {
                    "npi": prescription.prescriber_npi,
                    "firstName": _clip(prescriber_first, LIMITS["name"]),
                    "lastName": _clip(prescriber_last or prescriber_name, LIMITS["name"]),
                },
                "practice": {"id": int(getattr(settings, "LIFEFILE_PRACTICE_ID", 0))},
                "patient": {
                    "lastName": last,
                    "firstName": first,
                    "gender": GENDER_MAP.get((profile.sex_at_birth or "").lower(), "u"),
                    "dateOfBirth": profile.date_of_birth.isoformat(),
                    "address1": shipping["addressLine1"],
                    "address2": shipping["addressLine2"],
                    "city": shipping["city"],
                    "state": address.state,
                    "zip": address.zip_code,
                    "country": "US",
                    "phoneMobile": phone,
                    "email": shipping["recipientEmail"],
                },
                "shipping": shipping,
                "billing": {"payorType": "pat"},
                "rxs": [rx],
                "clinical": clinical_rows,
            },
        }
        return _prune(payload)

    @staticmethod
    def _lf_product_id(treatment: Any, pharmacy: Any) -> int | None:
        variant = treatment.variant
        if variant is None:
            return None
        mapping = variant.mappings.filter(organization=pharmacy).first()
        if mapping is None:
            return None
        try:
            return int(mapping.vendor_sku)
        except ValueError:
            return None

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "X-Vendor-ID": str(getattr(settings, "LIFEFILE_VENDOR_ID", "")),
            "X-Location-ID": str(getattr(settings, "LIFEFILE_LOCATION_ID", "")),
            "X-API-Network-ID": str(getattr(settings, "LIFEFILE_API_NETWORK_ID", "")),
        }
        user = getattr(settings, "LIFEFILE_BASIC_AUTH_USER", "")
        password = getattr(settings, "LIFEFILE_BASIC_AUTH_PASSWORD", "")
        if user and password:
            headers["Authorization"] = "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()
        return headers

    def submit_order(self, order: Any) -> PharmacySubmitResult:
        from apps.integrations.models import OutboundCall

        self._require_enabled()
        base_url = (getattr(settings, "LIFEFILE_API_BASE_URL", "") or "").rstrip("/")
        if not base_url:
            raise NotConfigured("LIFEFILE_API_BASE_URL is not set")
        payload = self.build_order_payload(order)
        started = time.monotonic()
        status_code, error, external_id = None, "", ""
        try:
            response = requests.post(f"{base_url}/order", json=payload, headers=self._headers(), timeout=TIMEOUT_SECONDS)
            status_code = response.status_code
            try:
                body = response.json()
            except ValueError:
                body = {}
            data = body.get("data") if isinstance(body.get("data"), dict) else {}
            external_id = str(data.get("orderId") or data.get("order_id") or body.get("orderId") or "")
            if status_code >= 400 or body.get("type") == "error":
                error = f"http_{status_code}"
        except requests.RequestException as exc:
            error = f"transport_error:{type(exc).__name__}"
        ok = not error
        OutboundCall.objects.create(
            vendor="lifefile",
            endpoint_name="create_order",
            treatment=order.treatment,
            request_summary={"order_id": str(order.pk), "rx_count": len(payload["order"]["rxs"])},
            status_code=status_code,
            ok=ok,
            error=error,
            duration_ms=int((time.monotonic() - started) * 1000),
        )
        return PharmacySubmitResult(ok=ok, external_order_id=external_id, error=error)

    def cancel_order(self, order: Any) -> PharmacyCancelResult:
        self._require_enabled()
        return PharmacyCancelResult(ok=False, error="unsupported")

    def handle_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        return parse_pharmacy_webhook(payload)


def get_pharmacy_adapter(pharmacy: Any) -> PharmacyAdapter:
    """Adapter for a pharmacy ``Organization``. LifeFile requires the routing feature flag."""
    key = (getattr(pharmacy, "integration_adapter", "") or "").strip().lower()
    if key == "lifefile":
        if not getattr(settings, "BEEMA_PHARMACY_ROUTING_ENABLED", False):
            raise PharmacyRoutingDisabled("Pharmacy routing is disabled")
        return LifeFileAdapter()
    if key == "fake":
        return FakePharmacyAdapter()
    raise NotConfigured(f"No pharmacy adapter registered for key {key or 'none'}")

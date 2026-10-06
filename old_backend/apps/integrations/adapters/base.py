from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class DoctorWebhookResult:
    patient_id: str
    submission_version: int | None
    external_review_id: str
    status: str
    decision: str
    patient_note: str
    internal_note: str
    prescription: dict[str, Any] | None
    prescriber: dict[str, Any] | None


class DoctorProviderAdapter(ABC):
    partner_slug: str

    @abstractmethod
    def parse_webhook(self, payload: dict[str, Any]) -> DoctorWebhookResult:
        raise NotImplementedError

    def submit_case(self, submission_snapshot: dict, *, patient_id: str, version: int) -> str:
        raise NotImplementedError(
            f"{self.partner_slug} outbound case submit is not implemented."
        )


class PharmacySubmitResult:
    def __init__(
        self,
        *,
        external_order_id: str,
        response_payload: dict[str, Any],
        status: str = "submitted",
    ):
        self.external_order_id = external_order_id
        self.response_payload = response_payload
        self.status = status


@dataclass
class PharmacyWebhookResult:
    external_order_id: str
    external_reference_id: str
    event_type: str
    status: str
    tracking_number: str
    carrier: str
    idempotency_key: str


class PharmacyProviderAdapter(ABC):
    partner_slug: str

    @abstractmethod
    def build_order_payload(
        self,
        *,
        order,
        prescription,
        snapshot: dict,
        message_id: int,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def submit_order(self, payload: dict[str, Any]) -> PharmacySubmitResult:
        raise NotImplementedError

    @abstractmethod
    def parse_webhook(self, payload: dict[str, Any]) -> PharmacyWebhookResult:
        raise NotImplementedError

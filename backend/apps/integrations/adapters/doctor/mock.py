from __future__ import annotations

from typing import Any

from apps.integrations.adapters.base import DoctorProviderAdapter, DoctorWebhookResult


class MockDoctorAdapter(DoctorProviderAdapter):
    partner_slug = "mock"

    def parse_webhook(self, payload: dict[str, Any]) -> DoctorWebhookResult:
        prescription = payload.get("prescription")
        prescriber = payload.get("prescriber")
        if prescription and not isinstance(prescription, dict):
            raise ValueError("prescription must be an object.")
        if prescriber and not isinstance(prescriber, dict):
            raise ValueError("prescriber must be an object.")
        return DoctorWebhookResult(
            patient_id=str(payload["patient_id"]),
            submission_version=payload.get("submission_version"),
            external_review_id=str(payload.get("external_review_id", "")),
            status=str(payload.get("status", "under_review")),
            decision=str(payload.get("decision", "")),
            patient_note=str(payload.get("patient_note", "")),
            internal_note=str(payload.get("internal_note", "")),
            prescription=prescription,
            prescriber=prescriber,
        )


class OpenLoopDoctorAdapter(DoctorProviderAdapter):
    partner_slug = "openloop"

    def parse_webhook(self, payload: dict[str, Any]) -> DoctorWebhookResult:
        raise NotImplementedError("OpenLoop doctor webhook parsing is not implemented yet.")

    def submit_case(self, submission_snapshot: dict, *, patient_id: str, version: int) -> str:
        raise NotImplementedError("OpenLoop case submit is not implemented yet.")

from __future__ import annotations

from typing import Any

from apps.integrations.adapters.base import DoctorProviderAdapter, DoctorWebhookResult


class OpenLoopDoctorAdapter(DoctorProviderAdapter):
    partner_slug = "openloop"

    def parse_webhook(self, payload: dict[str, Any]) -> DoctorWebhookResult:
        raise NotImplementedError("OpenLoop doctor webhook parsing is not implemented yet.")

    def submit_case(self, submission_snapshot: dict, *, patient_id: str, version: int) -> str:
        raise NotImplementedError("OpenLoop case submit is not implemented yet.")

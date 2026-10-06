from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class BelugaWebhookEvent:
    master_id: str
    event: str
    visit_outcome: str | None = None
    doc_name: str | None = None
    meds_prescribed: list[dict] = field(default_factory=list)
    content: str | None = None
    order_id: str | None = None
    info: dict = field(default_factory=dict)
    scheduled_date: str | None = None
    location: str | None = None
    booking_link: str | None = None
    lab_req_pdf: str | None = None


def parse_beluga_webhook(payload: dict[str, Any]) -> BelugaWebhookEvent:
    event = str(payload.get("event", "")).strip()
    if not event:
        raise ValueError("Missing 'event' field in Beluga webhook payload.")
    master_id = str(payload.get("masterId", "")).strip()
    if not master_id:
        raise ValueError("Missing 'masterId' field in Beluga webhook payload.")
    return BelugaWebhookEvent(
        master_id=master_id,
        event=event,
        visit_outcome=payload.get("visitOutcome"),
        doc_name=payload.get("docName"),
        meds_prescribed=payload.get("medsPrescribed") or [],
        content=payload.get("content"),
        order_id=payload.get("orderId"),
        info=payload.get("info") or {},
        scheduled_date=payload.get("scheduledDate"),
        location=payload.get("location"),
        booking_link=payload.get("bookingLink"),
        lab_req_pdf=payload.get("labReqPdf"),
    )

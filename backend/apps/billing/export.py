"""Patient data export contributor for the billing section."""
from __future__ import annotations

from typing import Any

from apps.patients.export import serialize_instance

from .models import AffiliateAttribution, CouponRedemption, Invoice, Refund, StoreCreditEntry, Subscription


def export_billing(patient: Any) -> dict[str, Any]:
    """Everything billing holds about one patient, as JSON-safe data."""
    invoices = Invoice.objects.filter(patient=patient).prefetch_related("lines")
    return {
        "billing": {
            "subscriptions": [serialize_instance(s) for s in Subscription.objects.filter(patient=patient)],
            "invoices": [
                {**serialize_instance(i), "lines": [serialize_instance(line) for line in i.lines.all()]} for i in invoices
            ],
            "refunds": [serialize_instance(r) for r in Refund.objects.filter(invoice__patient=patient)],
            "coupon_redemptions": [serialize_instance(r) for r in CouponRedemption.objects.filter(patient=patient)],
            "store_credit": [serialize_instance(e) for e in StoreCreditEntry.objects.filter(patient=patient)],
            "affiliate_attribution": [
                serialize_instance(a) for a in AffiliateAttribution.objects.filter(patient=patient)
            ],
        }
    }

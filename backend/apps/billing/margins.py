"""Margin math: what the patient paid (net of refunds) minus what vendors cost us."""
from __future__ import annotations

from django.db.models import Q, Sum

from .models import Invoice, VendorCost


def invoice_vendor_cost_cents(invoice: Invoice) -> int:
    """Vendor costs recorded against this invoice."""
    return int(VendorCost.objects.filter(invoice=invoice).aggregate(s=Sum("amount_cents"))["s"] or 0)


def invoice_margin_cents(invoice: Invoice) -> int:
    """Net paid on the invoice minus the vendor costs it offsets. Negative means a loss."""
    return invoice.net_paid_cents - invoice_vendor_cost_cents(invoice)


def patient_net_paid_cents(patient) -> int:
    invoices = Invoice.objects.filter(patient=patient, paid_at__isnull=False)
    return sum(i.total_cents - i.refunded_cents for i in invoices)


def patient_vendor_cost_cents(patient) -> int:
    """All vendor costs for the patient's treatments, linked to an invoice or not."""
    costs = VendorCost.objects.filter(Q(treatment__patient=patient) | Q(invoice__patient=patient)).distinct()
    return int(sum(c.amount_cents for c in costs))


def patient_margin_cents(patient) -> int:
    """Patient paid (net of refunds) minus every vendor cost. A refunded, not prescribed patient is negative."""
    return patient_net_paid_cents(patient) - patient_vendor_cost_cents(patient)

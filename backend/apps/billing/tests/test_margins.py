"""VendorCost margin math, per invoice and per patient."""
from __future__ import annotations

from django.utils import timezone

from apps.billing import margins, services
from apps.billing.models import VendorCost

from .factories import BillingTestCase, make_org, paid_subscription


class MarginTests(BillingTestCase):
    def cost(self, treatment, cents: int, kind: str = "drug", invoice=None) -> VendorCost:
        return VendorCost.objects.create(
            treatment=treatment, vendor=make_org(), kind=kind, amount_cents=cents, incurred_at=timezone.now(), invoice=invoice
        )

    def test_invoice_margin_is_net_paid_minus_linked_costs(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        self.cost(treatment, 3500, "visit", invoice)
        self.cost(treatment, 40000, "drug", invoice)
        self.assertEqual(margins.invoice_vendor_cost_cents(invoice), 43500)
        self.assertEqual(margins.invoice_margin_cents(invoice), 79100 - 43500)

    def test_costs_not_linked_to_an_invoice_do_not_count_against_the_invoice(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        self.cost(treatment, 5000)
        self.assertEqual(margins.invoice_margin_cents(invoice), 79100)

    def test_patient_margin_counts_every_cost_for_the_patient(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        self.cost(treatment, 3500, "visit", invoice)
        self.cost(treatment, 5000, "shipping")
        self.assertEqual(margins.patient_net_paid_cents(self.patient), 79100)
        self.assertEqual(margins.patient_vendor_cost_cents(self.patient), 8500)
        self.assertEqual(margins.patient_margin_cents(self.patient), 79100 - 8500)

    def test_refund_reduces_margin_and_not_prescribed_is_a_loss_of_the_doctor_fee(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100, submitted=True)
        self.cost(treatment, 3500, "visit", invoice)
        services.refund_not_prescribed(treatment)
        invoice.refresh_from_db()
        self.assertEqual(margins.invoice_margin_cents(invoice), -3500)
        self.assertEqual(margins.patient_margin_cents(self.patient), -3500)

    def test_partial_refund(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=1, price_cents=29700)
        self.cost(treatment, 10000, "drug", invoice)
        services.refund_invoice(invoice, 5000, "goodwill")
        invoice.refresh_from_db()
        self.assertEqual(margins.invoice_margin_cents(invoice), 29700 - 5000 - 10000)

    def test_unpaid_invoice_has_no_net_paid(self) -> None:
        from .factories import make_plan

        invoice = services.create_checkout(
            self.patient, make_plan(self.product), consents=["no_cancel_after_submit"]
        ).invoice
        self.assertEqual(margins.invoice_margin_cents(invoice), 0)

    def test_other_patients_are_isolated(self) -> None:
        from .factories import make_profile

        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        self.cost(treatment, 1000)
        self.assertEqual(margins.patient_margin_cents(make_profile()), 0)

    def test_multiple_invoices_sum_for_the_patient(self) -> None:
        sub, invoice, treatment = paid_subscription(self, term=1, price_cents=29700, submitted=True)
        self.stripe.add_card(sub.stripe_customer_id)
        services.run_renewals(sub.next_bill_on)
        self.cost(treatment, 9000)
        self.assertEqual(margins.patient_net_paid_cents(self.patient), 59400)
        self.assertEqual(margins.patient_margin_cents(self.patient), 59400 - 9000)

"""Test factories and the shared base case for billing tests."""
from __future__ import annotations

from datetime import timedelta
from itertools import count
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import Organization, User
from apps.billing import bridge
from apps.billing.models import Coupon, Invoice, InvoiceLine
from apps.billing.stripe_client import FakeStripeClient, set_stripe_client
from apps.catalog.models import Plan, PlanPrice, Product
from apps.clinical.models import Treatment
from apps.patients.models import PatientProfile

_n = count(1)


def make_profile(email: str | None = None) -> PatientProfile:
    user = User.objects.create_user(email or f"billing{next(_n)}@example.com")
    return PatientProfile.objects.create(user=user)


def make_product(slug: str | None = None) -> Product:
    slug = slug or f"product-{next(_n)}"
    return Product.objects.create(slug=slug, name=slug.title(), category="weight_loss", neutral_label="Beema Health membership")


def make_plan(product: Product, term: int = 1, price_cents: int = 29700, **extra) -> Plan:
    n = next(_n)
    kind = extra.pop("kind", "standard")
    commitment = extra.pop("billing_commitment", "renewing_monthly" if term == 1 else "prepaid_term")
    plan = Plan.objects.create(
        product=product, slug=extra.pop("slug", f"plan-{n}"), name=f"Plan {n}", kind=kind, term_months=term,
        billing_commitment=commitment, bill_interval_months=term, ship_interval_months=1 if term == 1 else 3,
        supply_days_per_shipment=28, allows_coupons=extra.pop("allows_coupons", True),
        stackable_with_term_discount=extra.pop("stackable_with_term_discount", True), **extra,
    )
    PlanPrice.objects.create(plan=plan, amount_cents=price_cents, effective_from=timezone.now() - timedelta(days=1))
    return plan


def make_coupon(code: str, kind: str = "fixed", value: int = 10000, **extra) -> Coupon:
    products = extra.pop("products", [])
    patients = extra.pop("patients", [])
    coupon = Coupon.objects.create(code=code, kind=kind, value=value, **extra)
    coupon.products.set(products)
    coupon.patients.set(patients)
    return coupon


def make_treatment(profile: PatientProfile, product: Product, plan: Plan | None = None, **extra) -> Treatment:
    extra.setdefault("status", "awaiting_payment")
    return Treatment.objects.create(patient=profile, product=product, plan=plan, **extra)


def make_org() -> Organization:
    n = next(_n)
    return Organization.objects.create(name=f"Vendor {n}", slug=f"vendor-{n}", kind="network")


def make_paid_invoice(profile, plan: Plan, *, total_cents: int | None = None, treatment=None, pi: str | None = None, **extra) -> Invoice:
    """An invoice that is already paid, with a PaymentIntent known to the fake Stripe."""
    total = plan_price(plan) if total_cents is None else total_cents
    pi = pi or f"pi_test{next(_n)}"
    invoice = Invoice.objects.create(
        patient=profile, treatment=treatment, kind="subscription", status="paid", subtotal_cents=total,
        total_cents=total, paid_at=timezone.now(), stripe_payment_intent_id=pi, **extra,
    )
    InvoiceLine.objects.create(
        invoice=invoice, description_internal=plan.name, neutral_description="Beema Health membership",
        amount_cents=total, plan=plan, product=plan.product,
    )
    return invoice


def plan_price(plan: Plan) -> int:
    return plan.prices.order_by("-effective_from").first().amount_cents


class BillingTestCase(TestCase):
    """Installs a fake Stripe and stubs the cross-app side effects that tests do not care about."""

    def setUp(self) -> None:
        super().setUp()
        self.stripe = FakeStripeClient()
        set_stripe_client(self.stripe)
        self.addCleanup(set_stripe_client, None)
        for name in ("create_batches", "notify_patient", "record_care_event"):
            patcher = mock.patch.object(bridge, name)
            setattr(self, f"mock_{name}", patcher.start())
            self.addCleanup(patcher.stop)
        self.product = make_product()
        self.patient = make_profile()

    def register_fake_payment(self, invoice: Invoice) -> None:
        """Make the fake Stripe know the PaymentIntent of a hand built invoice so refunds can run."""
        self.stripe.payment_intents[invoice.stripe_payment_intent_id] = {
            "amount": invoice.total_cents, "status": "succeeded", "metadata": {},
        }


def paid_subscription(case: "BillingTestCase", term: int = 1, price_cents: int | None = None, *, submitted: bool = False,
                      auto_renew: bool = True, coupon_codes=()):
    """Run a real checkout and payment so the subscription, invoice and fake Stripe charge all exist."""
    from apps.billing import services

    plan = make_plan(case.product, term=term, **({"price_cents": price_cents} if price_cents else {}))
    treatment = make_treatment(case.patient, case.product, plan)
    consents = ["no_cancel_after_submit"] + (["auto_renew"] if auto_renew else [])
    invoice = services.create_checkout(case.patient, plan, coupon_codes, consents=consents, treatment=treatment).invoice
    invoice = services.handle_payment_succeeded(invoice.stripe_payment_intent_id, payment_method_id="pm_test")
    if submitted:
        submit(treatment)
    treatment.refresh_from_db()
    return invoice.subscription, invoice, treatment


def submit(treatment) -> None:
    treatment.submitted_to_network_at = timezone.now()
    treatment.save(update_fields=["submitted_to_network_at"])

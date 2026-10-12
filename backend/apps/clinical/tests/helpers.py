"""Test factories for clinical and routing tests."""
from __future__ import annotations

from decimal import Decimal
from itertools import count
from unittest import mock

from apps.accounts.tests.helpers import make_org, make_patient
from apps.catalog.models import Plan, PlanPhase, Product, ProductVariant
from apps.clinical.models import Treatment, Visit
from apps.patients.models import Address

_n = count(1)


def make_profile(email: str | None = None):
    """A patient user with a profile; returns the PatientProfile."""
    return make_patient(email).patient_profile


def make_address(profile, state: str = "TX", **extra) -> Address:
    return Address.objects.create(
        patient=profile, kind=extra.pop("kind", "shipping"), line1="1 Main St", city="Austin",
        state=state, zip_code="78701", is_default=extra.pop("is_default", True), **extra,
    )


def make_product(slug: str | None = None) -> Product:
    slug = slug or f"product-{next(_n)}"
    return Product.objects.create(slug=slug, name=slug.title(), category="weight_loss", neutral_label="Beema Health membership")


def make_variant(product: Product, strength: str | None = "5.00", drug: str = "tirzepatide", **extra) -> ProductVariant:
    n = next(_n)
    return ProductVariant.objects.create(
        product=product, drug=drug, additive=extra.pop("additive", "none"), phase=extra.pop("phase", "titration"),
        strength_mg=Decimal(strength) if strength is not None else None, slug=extra.pop("slug", f"variant-{n}"), **extra,
    )


def make_plan(product: Product, variant: ProductVariant | None = None, term: int = 1, supply_days: int = 28, **extra) -> Plan:
    n = next(_n)
    return Plan.objects.create(
        product=product, variant=variant, slug=extra.pop("slug", f"plan-{n}"), name=f"Plan {n}", term_months=term,
        billing_commitment="renewing_monthly" if term == 1 else "prepaid_term", bill_interval_months=term,
        ship_interval_months=1, supply_days_per_shipment=supply_days, **extra,
    )


def make_phase(plan: Plan, sequence: int, start_month: int, variant: ProductVariant | None, interval: int = 7) -> PlanPhase:
    return PlanPhase.objects.create(
        plan=plan, sequence=sequence, start_month=start_month, variant=variant, dose_interval_days=interval
    )


def make_treatment(profile, status: str = Treatment.Status.AWAITING_VISIT_COMPLETION, product=None, **extra) -> Treatment:
    product = product or make_product()
    return Treatment.objects.create(patient=profile, product=product, status=status, **extra)


def make_visit(treatment: Treatment, **extra) -> Visit:
    return Visit.objects.create(treatment=treatment, external_id=extra.pop("external_id", f"m-{next(_n)}"), **extra)


class StubbedHooksMixin:
    """Stub every cross-app hook so tests run without other apps and can assert calls."""

    def setUp(self) -> None:
        super().setUp()
        self.hooks = {}
        for name in ("refund_not_prescribed", "refund_canceled_before_submission", "record_event", "notify_patient", "submit_visit"):
            patcher = mock.patch(f"apps.clinical.hooks.{name}")
            self.hooks[name] = patcher.start()
            self.addCleanup(patcher.stop)

"""Test factories for integrations and fulfillment tests."""
from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from itertools import count

from django.test import Client

from apps.accounts.models import Organization
from apps.accounts.tests.helpers import make_org, make_patient
from apps.billing.models import Subscription
from apps.catalog.models import Plan, Product, ProductVariant, VariantMapping
from apps.clinical.models import Treatment, Visit

_n = count(1)
BELUGA_SECRET = "test-beluga-secret"


def make_graph(
    *,
    status: str = Treatment.Status.PENDING_VISIT,
    routing_mode: str = "network_routes",
    external_id: str | None = None,
    category: str = "weight_loss",
):
    """A patient with a treatment, network, pharmacy and one initial visit."""
    n = next(_n)
    user = make_patient(f"graph{n}@example.com", first_name="Pat", last_name="Tester", phone="+15125550100")
    profile = user.patient_profile
    network = make_org(f"beluga-{n}", kind=Organization.Kind.NETWORK, integration_adapter="beluga")
    pharmacy = make_org(f"pharm-{n}", kind=Organization.Kind.PHARMACY, integration_adapter="fake")
    product = Product.objects.create(
        slug=f"prod-{n}", name="Prod", category=category, neutral_label="Beema Health membership", routing_mode=routing_mode
    )
    variant = ProductVariant.objects.create(
        product=product, drug="semaglutide", phase="titration", strength_mg=Decimal("0.25"), slug=f"var-{n}"
    )
    VariantMapping.objects.create(variant=variant, organization=network, vendor_sku="MED-1")
    plan = Plan.objects.create(
        product=product, variant=variant, slug=f"plan-{n}", name="Plan", term_months=1, billing_commitment="renewing_monthly",
        bill_interval_months=1, ship_interval_months=1, supply_days_per_shipment=30,
    )
    treatment = Treatment.objects.create(
        patient=profile, product=product, plan=plan, variant=variant, status=status, network=network, pharmacy=pharmacy,
        requested_strength_mg=Decimal("0.25"),
    )
    visit = Visit.objects.create(treatment=treatment, external_id=external_id or f"master-{n}")
    return profile, treatment, visit


def make_subscription(treatment, *, term: int = 1, commitment: str | None = None, batches_total: int = 0, starts: date | None = None, **extra):
    starts = starts or date(2026, 1, 1)
    plan = treatment.plan
    plan.term_months = term
    plan.billing_commitment = commitment or ("renewing_monthly" if term == 1 else "prepaid_term")
    plan.save()
    return Subscription.objects.create(
        patient=treatment.patient,
        treatment=treatment,
        plan=plan,
        commitment=commitment or ("renewing_monthly" if term == 1 else "prepaid_term"),
        term_months=term,
        term_starts_on=starts,
        term_ends_on=date(starts.year + (starts.month - 1 + term) // 12, (starts.month - 1 + term) % 12 + 1, starts.day),
        paid_through=starts,
        batches_total=batches_total,
        **extra,
    )


def post_beluga(client: Client, payload, secret: str | None = BELUGA_SECRET, **headers):
    """POST a Beluga webhook body (dict or raw bytes) with the shared secret header."""
    body = payload if isinstance(payload, (bytes, str)) else json.dumps(payload)
    if secret is not None:
        headers.setdefault("HTTP_X_WEBHOOK_SECRET", secret)
    return client.post("/api/v1/webhooks/beluga/", data=body, content_type="application/json", **headers)

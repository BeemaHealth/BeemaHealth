"""Catalog services: pricing and variant resolution."""
from typing import Optional

from django.utils import timezone

from apps.catalog.models import Plan, PlanPrice, PriceOverride, ProductVariant


def current_price(plan: Plan, at: Optional[timezone.datetime] = None) -> int:
    """
    Get the current price (in cents) for a plan, effective at a given time.

    If no time is provided, uses the current time. Checks for patient-specific
    overrides first, then falls back to the base plan price.

    Args:
        plan: The Plan to price.
        at: Datetime to check (defaults to now).

    Returns:
        Price in cents.

    Raises:
        PlanPrice.DoesNotExist: If no price is available.
    """
    if at is None:
        at = timezone.now()

    # Get the most recent price that's effective at this time
    price = (
        PlanPrice.objects.filter(
            plan=plan,
            effective_from__lte=at,
        )
        .exclude(
            effective_to__isnull=False,
            effective_to__lt=at,
        )
        .order_by("-effective_from")
        .first()
    )

    if not price:
        raise PlanPrice.DoesNotExist(f"No price found for plan {plan.slug} at {at}")

    return price.amount_cents


def resolve_variant(drug: str, additive: str, phase: str) -> ProductVariant:
    """
    Resolve a ProductVariant by drug, additive, and phase.

    Args:
        drug: Drug name (e.g., "semaglutide", "tirzepatide").
        additive: Additive (e.g., "none", "b12", "glycine").
        phase: Phase (e.g., "titration", "maintenance").

    Returns:
        The matching ProductVariant.

    Raises:
        ProductVariant.DoesNotExist: If no matching variant exists.
    """
    return ProductVariant.objects.get(
        drug=drug,
        additive=additive,
        phase=phase,
        is_active=True,
    )


def get_override_price(plan: Plan, patient_id: Optional[str] = None, at: Optional[timezone.datetime] = None) -> Optional[int]:
    """
    Get a price override for a plan and patient, if one exists and is active.

    Args:
        plan: The Plan to check.
        patient_id: Optional patient UUID. If provided, checks for patient-specific overrides.
        at: Datetime to check (defaults to now).

    Returns:
        Price in cents, or None if no override applies.
    """
    if at is None:
        at = timezone.now()

    query = PriceOverride.objects.filter(
        plan=plan,
        is_active=True,
    )

    # Check expiration
    query = query.filter(
        models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=at)
    )

    # Patient-specific override takes precedence
    if patient_id:
        override = query.filter(patient_id=patient_id).first()
        if override:
            return override.amount_cents

    return None


# Helper to import Q if needed
from django.db import models  # noqa: E402

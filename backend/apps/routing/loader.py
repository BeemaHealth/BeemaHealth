"""Load routing seed data from ``definitions/catalog/routing.yaml`` (idempotent)."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml
from django.db import transaction

logger = logging.getLogger(__name__)


class RoutingDefinitionError(Exception):
    """The routing definition file references something that does not exist."""


@transaction.atomic
def load_routing_definitions(definitions_dir: Path) -> dict[str, int]:
    """Upsert organizations (by slug) and rules (by name). Returns counts."""
    from apps.accounts.models import Organization
    from apps.catalog.models import Product

    path = Path(definitions_dir) / "catalog" / "routing.yaml"
    if not path.exists():
        logger.warning("Routing definitions not found: %s", path)
        return {"organizations": 0, "rules": 0}
    data: dict[str, Any] = yaml.safe_load(path.read_text()) or {}

    from .models import RoutingRule

    orgs: dict[str, Organization] = {}
    for item in data.get("organizations", []):
        org, _ = Organization.objects.update_or_create(
            slug=item["slug"],
            defaults={
                "kind": item["kind"],
                "name": item["name"],
                "integration_adapter": item.get("integration_adapter", ""),
            },
        )
        orgs[org.slug] = org

    def org_for(slug: str) -> Organization:
        if slug not in orgs:
            found = Organization.objects.filter(slug=slug).first()
            if found is None:
                raise RoutingDefinitionError(f"Unknown organization slug: {slug}")
            orgs[slug] = found
        return orgs[slug]

    count = 0
    for item in data.get("rules", []):
        product = None
        if item.get("product_slug"):
            product = Product.objects.filter(slug=item["product_slug"]).first()
            if product is None:
                raise RoutingDefinitionError(f"Unknown product slug: {item['product_slug']}")
        RoutingRule.objects.update_or_create(
            name=item["name"],
            defaults={
                "product": product,
                "network": org_for(item["network_slug"]),
                "pharmacy": org_for(item["pharmacy_slug"]) if item.get("pharmacy_slug") else None,
                "priority": item.get("priority", 100),
                "is_active": item.get("is_active", True),
                "states_mode": item.get("states_mode", "all"),
                "states": item.get("states", []),
                "fill_type": item.get("fill_type", "any"),
                "term_months": item.get("term_months", []),
                "dose_min_mg": item.get("dose_min_mg"),
                "dose_max_mg": item.get("dose_max_mg"),
                "orders_per_day_threshold": item.get("orders_per_day_threshold"),
                "route_errors_only": item.get("route_errors_only", False),
                "refill_only": item.get("refill_only", False),
            },
        )
        count += 1
    return {"organizations": len(orgs), "rules": count}

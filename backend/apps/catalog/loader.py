"""Catalog definition loader with extensible registry for other apps."""
import json
import logging
from pathlib import Path
from typing import Any, Callable, Dict

import yaml

logger = logging.getLogger(__name__)

# Registry of loader functions keyed by app name
_loader_registry: Dict[str, Callable[[Path], None]] = {}


def register_loader(app_name: str, loader_func: Callable[[Path], None]) -> None:
    """
    Register a definition loader for another app.

    Called at app initialization time by other apps (e.g., questionnaires)
    that want to load their own definitions when load_definitions runs.

    Args:
        app_name: Name of the app (e.g., 'questionnaires').
        loader_func: Callable that takes a definitions dir path and loads definitions.
    """
    if app_name in _loader_registry:
        logger.warning(f"Loader for {app_name} is already registered; overwriting")
    _loader_registry[app_name] = loader_func


def get_loaders() -> Dict[str, Callable[[Path], None]]:
    """Get all registered loaders."""
    return _loader_registry.copy()


def load_yaml_file(path: Path) -> Any:
    """Load and parse a YAML file."""
    with open(path, "r") as f:
        return yaml.safe_load(f)


def load_json_file(path: Path) -> Any:
    """Load and parse a JSON file."""
    with open(path, "r") as f:
        return json.load(f)


def load_catalog_definitions(definitions_dir: Path, dev_mode: bool = False) -> None:
    """
    Load product, plan, and pricing definitions from YAML files.

    Idempotent: creates or updates products and plans by slug.

    Args:
        definitions_dir: Base definitions directory (e.g., backend/definitions/).
        dev_mode: If True (and DEBUG is on), also load dev variant mappings (fake placeholder
                 medIds). Never loaded implicitly.
    """
    from django.conf import settings

    catalog_dir = definitions_dir / "catalog"
    if not catalog_dir.exists():
        logger.warning(f"Catalog definitions directory not found: {catalog_dir}")
        return

    # Load products first
    for yaml_file in sorted(catalog_dir.glob("*.yaml")):
        if yaml_file.name.startswith("routing") or yaml_file.name.startswith("variant_mappings"):
            # Skip routing and variant mapping files for now
            continue

        logger.info(f"Loading catalog from {yaml_file.name}")
        data = load_yaml_file(yaml_file)

        if "products" in data:
            _load_products(data["products"])

    # Load variants (depends on products)
    for yaml_file in sorted(catalog_dir.glob("*.yaml")):
        if yaml_file.name.startswith("routing") or yaml_file.name.startswith("variant_mappings"):
            continue

        data = load_yaml_file(yaml_file)
        if "variants" in data:
            _load_variants(data["variants"])

    # Load plans and phases (depends on products and variants)
    for yaml_file in sorted(catalog_dir.glob("*.yaml")):
        if yaml_file.name.startswith("routing") or yaml_file.name.startswith("variant_mappings"):
            continue

        data = load_yaml_file(yaml_file)
        if "plans" in data:
            _load_plans(data["plans"])

    # Fake placeholder medIds: only with an explicit dev load, and never when DEBUG is off.
    if dev_mode and settings.DEBUG:
        dev_mappings_file = catalog_dir / "variant_mappings_dev.yaml"
        if dev_mappings_file.exists():
            logger.info("Loading dev variant mappings from variant_mappings_dev.yaml")
            data = load_yaml_file(dev_mappings_file)
            if "variant_mappings" in data:
                _load_variant_mappings(data["variant_mappings"])


def _load_products(products_data: list) -> None:
    """Load products from definition list."""
    from apps.catalog.models import Product

    for product_def in products_data:
        slug = product_def["slug"]
        defaults = {
            "name": product_def.get("name", slug),
            "category": product_def.get("category", "other"),
            "is_active": product_def.get("is_active", True),
            "questionnaire_slug": product_def.get("questionnaire_slug", ""),
            "routing_mode": product_def.get("routing_mode", "network_routes"),
            "neutral_label": product_def.get("neutral_label", ""),
            "requires_ineligibility_check": product_def.get("requires_ineligibility_check", False),
        }
        product, created = Product.objects.update_or_create(slug=slug, defaults=defaults)
        action = "Created" if created else "Updated"
        logger.info(f"{action} product: {product.slug}")


def _load_variants(variants_data: list) -> None:
    """Load product variants from definition list."""
    from apps.catalog.models import Product, ProductVariant

    for variant_def in variants_data:
        slug = variant_def["slug"]
        product_slug = variant_def["product_slug"]

        try:
            product = Product.objects.get(slug=product_slug)
        except Product.DoesNotExist:
            logger.error(f"Product not found for variant {slug}: {product_slug}")
            continue

        defaults = {
            "product": product,
            "drug": variant_def.get("drug", ""),
            "additive": variant_def.get("additive", "none"),
            "phase": variant_def.get("phase", "maintenance"),
            "strength_mg": variant_def.get("strength_mg"),
            "form": variant_def.get("form", ""),
            "is_active": variant_def.get("is_active", True),
        }

        variant, created = ProductVariant.objects.update_or_create(slug=slug, defaults=defaults)
        action = "Created" if created else "Updated"
        logger.info(f"{action} variant: {variant.slug}")


def _load_plans(plans_data: list) -> None:
    """Load plans and their pricing from definition list."""
    from apps.catalog.models import Plan, PlanPhase, PlanPrice, Product, ProductVariant

    for plan_def in plans_data:
        slug = plan_def["slug"]
        product_slug = plan_def["product_slug"]
        variant_slug = plan_def.get("variant_slug")

        try:
            product = Product.objects.get(slug=product_slug)
        except Product.DoesNotExist:
            logger.error(f"Product not found for plan {slug}: {product_slug}")
            continue

        variant = None
        if variant_slug:
            try:
                variant = ProductVariant.objects.get(slug=variant_slug)
            except ProductVariant.DoesNotExist:
                logger.warning(f"Variant not found for plan {slug}: {variant_slug}")

        defaults = {
            "product": product,
            "variant": variant,
            "name": plan_def.get("name", slug),
            "kind": plan_def.get("kind", "standard"),
            "term_months": plan_def.get("term_months"),
            "billing_commitment": plan_def.get("billing_commitment", "renewing_monthly"),
            "bill_interval_months": plan_def.get("bill_interval_months", 1),
            "ship_interval_months": plan_def.get("ship_interval_months", 1),
            "supply_days_per_shipment": plan_def.get("supply_days_per_shipment", 30),
            "allows_coupons": plan_def.get("allows_coupons", True),
            "stackable_with_term_discount": plan_def.get("stackable_with_term_discount", False),
            "is_active": plan_def.get("is_active", True),
            "renews_at_term_end_default": plan_def.get("renews_at_term_end_default", True),
        }

        plan, created = Plan.objects.update_or_create(slug=slug, defaults=defaults)
        action = "Created" if created else "Updated"
        logger.info(f"{action} plan: {plan.slug}")

        # Load pricing if provided
        if "prices" in plan_def:
            _load_plan_prices(plan, plan_def["prices"])

        # Load phases if provided
        if "phases" in plan_def:
            _load_plan_phases(plan, plan_def["phases"])


def _load_plan_prices(plan: Any, prices_data: list) -> None:
    """Load prices for a plan."""
    from apps.catalog.models import PlanPrice

    # Clear existing prices (they're being reloaded from definitions)
    PlanPrice.objects.filter(plan=plan).delete()

    for price_def in prices_data:
        from django.utils.dateparse import parse_datetime

        effective_from = parse_datetime(price_def["effective_from"])
        effective_to = None
        if "effective_to" in price_def and price_def["effective_to"]:
            effective_to = parse_datetime(price_def["effective_to"])

        PlanPrice.objects.create(
            plan=plan,
            amount_cents=int(price_def["amount_cents"]),
            effective_from=effective_from,
            effective_to=effective_to,
            currency=price_def.get("currency", "usd"),
        )
        logger.debug(f"Created price for {plan.slug}: {price_def['amount_cents']} cents")


def _load_plan_phases(plan: Any, phases_data: list) -> None:
    """Load phases for a plan."""
    from apps.catalog.models import PlanPhase, ProductVariant

    # Clear existing phases
    PlanPhase.objects.filter(plan=plan).delete()

    for phase_def in phases_data:
        variant = None
        if "variant_slug" in phase_def and phase_def["variant_slug"]:
            try:
                variant = ProductVariant.objects.get(slug=phase_def["variant_slug"])
            except ProductVariant.DoesNotExist:
                logger.warning(f"Variant not found for phase: {phase_def['variant_slug']}")

        PlanPhase.objects.create(
            plan=plan,
            sequence=phase_def["sequence"],
            start_month=phase_def["start_month"],
            variant=variant,
            dose_interval_days=phase_def.get("dose_interval_days", 30),
        )
        logger.debug(f"Created phase {phase_def['sequence']} for {plan.slug}")


def _load_variant_mappings(mappings_data: list) -> None:
    """Load variant mappings (vendor SKUs/medIds) from definition list.

    Used for dev mode with fake placeholder medIds.
    """
    from apps.catalog.models import ProductVariant, VariantMapping
    from apps.accounts.models import Organization

    for mapping_def in mappings_data:
        variant_slug = mapping_def["variant_slug"]
        org_slug = mapping_def["organization_slug"]
        vendor_sku = mapping_def["vendor_sku"]

        try:
            variant = ProductVariant.objects.get(slug=variant_slug)
        except ProductVariant.DoesNotExist:
            logger.error(f"Variant not found for mapping: {variant_slug}")
            continue

        try:
            org = Organization.objects.get(slug=org_slug)
        except Organization.DoesNotExist:
            if org_slug == "beluga":
                # Create Beluga organization for dev mode if routing app hasn't loaded yet
                org, created = Organization.objects.get_or_create(
                    slug=org_slug,
                    defaults={
                        "kind": "network",
                        "name": "Beluga Health",
                        "integration_adapter": "beluga",
                        "is_active": True,
                    },
                )
                logger.info(f"Created Beluga organization for dev mode")
            else:
                logger.error(f"Organization not found for mapping: {org_slug}")
                continue

        mapping, created = VariantMapping.objects.update_or_create(
            variant=variant,
            organization=org,
            defaults={"vendor_sku": vendor_sku},
        )
        action = "Created" if created else "Updated"
        logger.info(f"{action} mapping: {variant.slug} @ {org.slug} = {vendor_sku}")

"""Management command to check launch readiness of catalog."""
import sys

from django.core.management.base import BaseCommand

from apps.catalog.models import Plan, Product, ProductVariant, VariantMapping
from apps.catalog.services import current_price


class Command(BaseCommand):
    """Check that the catalog is ready for launch."""

    help = "Validate catalog completeness for launch (pricing, variants, mappings, routing)"

    def add_arguments(self, parser):
        """Add command-line arguments."""
        parser.add_argument(
            "--quiet",
            action="store_true",
            help="Suppress output, exit nonzero if any issues found",
        )

    def handle(self, *args, **options):
        """Check launch readiness."""
        quiet = options.get("quiet", False)
        issues = []

        # Check variants: every active variant must have strength_mg
        active_variants = ProductVariant.objects.filter(is_active=True)
        for variant in active_variants:
            if variant.strength_mg is None:
                issues.append(f"VARIANT: {variant.slug} has no strength_mg")

        # Check variant mappings: every active variant must have mapping for routed network
        for variant in active_variants:
            # Check if the variant's product has a routing rule
            product = variant.product
            has_beluga_route = self._has_routing_rule(product)

            if has_beluga_route:
                # If the product is routed via Beluga, the variant must have a Beluga mapping
                has_mapping = VariantMapping.objects.filter(
                    variant=variant, organization__slug="beluga"
                ).exists()
                if not has_mapping:
                    issues.append(f"MAPPING: {variant.slug} has no Beluga medId mapping")

        # Check plans: every active plan must have a current price
        active_plans = Plan.objects.filter(is_active=True)
        for plan in active_plans:
            try:
                current_price(plan)
            except Exception:
                issues.append(f"PRICE: {plan.slug} has no current price")

        # Check products: every active product must have routing rule(s)
        active_products = Product.objects.filter(is_active=True)
        unmapped_products = []
        for product in active_products:
            if not self._has_routing_rule(product):
                unmapped_products.append(product.slug)
                issues.append(f"ROUTING: {product.slug} has no active routing rule")

        # Report
        if not quiet:
            if issues:
                self.stdout.write(
                    self.style.ERROR(f"\nFound {len(issues)} launch readiness issue(s):\n")
                )
                for issue in sorted(issues):
                    self.stdout.write(self.style.ERROR(f"  {issue}"))
                self.stdout.write("")

                if unmapped_products:
                    self.stdout.write(self.style.WARNING("Unmapped products (no routing rule):"))
                    for slug in sorted(unmapped_products):
                        self.stdout.write(f"  - {slug}")
                    self.stdout.write("")
            else:
                self.stdout.write(self.style.SUCCESS("All launch readiness checks passed!"))

        # Exit with error if issues found
        if issues:
            sys.exit(1)

    def _has_routing_rule(self, product: Product) -> bool:
        """Check if a product has an active routing rule."""
        try:
            from apps.routing.models import RoutingRule

            return RoutingRule.objects.filter(product=product, is_active=True).exists()
        except Exception:
            # routing app may not be loaded yet
            return False

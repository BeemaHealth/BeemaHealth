"""Catalog API views (read-only, public)."""
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.catalog.models import Plan, PlanPhase, PlanPrice, Product, ProductVariant
from apps.catalog.services import current_price


class ProductVariantSerializer(serializers.ModelSerializer):
    """Serializer for ProductVariant."""

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "slug",
            "drug",
            "additive",
            "phase",
            "strength_mg",
            "form",
            "is_active",
        ]
        read_only_fields = fields


class PlanPriceSerializer(serializers.ModelSerializer):
    """Serializer for PlanPrice."""

    class Meta:
        model = PlanPrice
        fields = [
            "id",
            "amount_cents",
            "effective_from",
            "effective_to",
            "currency",
        ]
        read_only_fields = fields


class PlanPhaseSerializer(serializers.ModelSerializer):
    """Serializer for PlanPhase."""

    variant = ProductVariantSerializer(read_only=True)

    class Meta:
        model = PlanPhase
        fields = [
            "id",
            "sequence",
            "start_month",
            "variant",
            "dose_interval_days",
        ]
        read_only_fields = fields


class PlanSerializer(serializers.ModelSerializer):
    """Serializer for Plan with current pricing."""

    prices = serializers.SerializerMethodField()
    phases = PlanPhaseSerializer(many=True, read_only=True)
    current_price_cents = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            "id",
            "slug",
            "product_id",
            "variant_id",
            "name",
            "kind",
            "term_months",
            "billing_commitment",
            "bill_interval_months",
            "ship_interval_months",
            "supply_days_per_shipment",
            "allows_coupons",
            "stackable_with_term_discount",
            "renews_at_term_end_default",
            "current_price_cents",
            "prices",
            "phases",
        ]
        read_only_fields = fields

    def get_prices(self, obj: Plan) -> list:
        """Get all prices for the plan."""
        prices = obj.prices.all().order_by("-effective_from")
        return PlanPriceSerializer(prices, many=True).data

    def get_current_price_cents(self, obj: Plan) -> int:
        """Get the current effective price."""
        try:
            return current_price(obj)
        except Exception:
            return 0


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product (detail view with plans)."""

    plans = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "category",
            "neutral_label",
            "questionnaire_slug",
            "routing_mode",
            "requires_ineligibility_check",
            "plans",
        ]
        read_only_fields = fields

    def get_plans(self, obj: Product) -> list:
        """Get all active plans for the product."""
        plans = obj.plans.filter(is_active=True).order_by("term_months")
        return PlanSerializer(plans, many=True).data


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for Product (list view - no plans)."""

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "category",
            "neutral_label",
            "questionnaire_slug",
            "routing_mode",
            "requires_ineligibility_check",
        ]
        read_only_fields = fields


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only API for products and their plans."""

    queryset = Product.objects.filter(is_active=True).prefetch_related("plans", "plans__phases")
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_serializer_class(self):
        """Use full serializer for detail view, list serializer for list."""
        if self.action == "retrieve":
            return ProductSerializer
        return ProductListSerializer

    @action(detail=True, methods=["get"])
    def plans(self, request, slug=None):
        """Get plans for a specific product."""
        product = self.get_object()
        plans = product.plans.filter(is_active=True).order_by("term_months")
        serializer = PlanSerializer(plans, many=True)
        return Response({"product_slug": product.slug, "plans": serializer.data})

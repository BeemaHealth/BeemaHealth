"""Unit tests for catalog API endpoints."""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Plan, PlanPhase, PlanPrice, Product, ProductVariant


class ProductAPITestCase(TestCase):
    """Tests for product API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            slug="sema-none-titration",
            drug="semaglutide",
            additive="none",
            phase="titration",
        )
        self.plan = Plan.objects.create(
            product=self.product,
            variant=self.variant,
            slug="sema-monthly",
            name="Monthly",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
            is_active=True,
        )
        now = timezone.now()
        PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=now,
        )

    def test_list_products(self):
        """Test listing active products."""
        url = reverse("catalog:product-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        # DRF pagination returns {'results': [...], 'count': N}
        data = response.data
        results = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["slug"], "weight-loss")

    def test_list_products_excludes_inactive(self):
        """Test that inactive products are excluded from list."""
        Product.objects.create(
            slug="inactive-product",
            name="Inactive",
            category="other",
            neutral_label="Inactive",
            is_active=False,
        )
        url = reverse("catalog:product-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.data
        results = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(len(results), 1)

    def test_get_product_detail(self):
        """Test retrieving a product with its plans."""
        url = reverse("catalog:product-detail", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["slug"], "weight-loss")
        self.assertEqual(response.data["name"], "Weight Loss")
        self.assertEqual(len(response.data["plans"]), 1)
        self.assertEqual(response.data["plans"][0]["slug"], "sema-monthly")

    def test_get_product_detail_not_found(self):
        """Test that 404 is returned for non-existent product."""
        url = reverse("catalog:product-detail", kwargs={"slug": "nonexistent"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_product_detail_includes_plan_pricing(self):
        """Test that product detail includes plan pricing."""
        url = reverse("catalog:product-detail", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        plan_data = response.data["plans"][0]
        self.assertEqual(plan_data["current_price_cents"], 19900)
        self.assertEqual(len(plan_data["prices"]), 1)
        self.assertEqual(plan_data["prices"][0]["amount_cents"], 19900)

    def test_product_detail_includes_phases(self):
        """Test that product detail includes plan phases."""
        # Add a phase to the plan
        PlanPhase.objects.create(
            plan=self.plan,
            sequence=1,
            start_month=0,
            variant=self.variant,
            dose_interval_days=30,
        )
        url = reverse("catalog:product-detail", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        plan_data = response.data["plans"][0]
        self.assertEqual(len(plan_data["phases"]), 1)
        self.assertEqual(plan_data["phases"][0]["sequence"], 1)
        self.assertEqual(plan_data["phases"][0]["dose_interval_days"], 30)

    def test_product_plans_endpoint(self):
        """Test the dedicated plans endpoint for a product."""
        url = reverse("catalog:product-plans", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["product_slug"], "weight-loss")
        self.assertEqual(len(response.data["plans"]), 1)

    def test_list_products_permission_is_public(self):
        """Test that product list is publicly accessible."""
        # Should succeed without authentication
        url = reverse("catalog:product-list")
        response = self.client.get(url, HTTP_AUTHORIZATION="Bearer invalid")
        self.assertEqual(response.status_code, 200)

    def test_plan_data_structure(self):
        """Test that plan data includes all required fields."""
        url = reverse("catalog:product-detail", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        plan = response.data["plans"][0]
        required_fields = [
            "id",
            "slug",
            "name",
            "kind",
            "term_months",
            "billing_commitment",
            "bill_interval_months",
            "ship_interval_months",
            "supply_days_per_shipment",
            "allows_coupons",
            "current_price_cents",
        ]
        for field in required_fields:
            self.assertIn(field, plan)

    def test_variant_in_product_detail(self):
        """Test that variant info is included in product detail."""
        url = reverse("catalog:product-detail", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        plan = response.data["plans"][0]
        self.assertIsNotNone(plan.get("variant_id"))
        # variant_id may be UUID or string depending on serializer output
        variant_id_str = str(plan["variant_id"]) if plan["variant_id"] else None
        self.assertEqual(variant_id_str, str(self.variant.id))

    def test_prepaid_plan_details(self):
        """Test that prepaid plan details are correct."""
        prepaid_plan = Plan.objects.create(
            product=self.product,
            slug="sema-3month",
            name="3 months",
            kind="standard",
            term_months=3,
            billing_commitment="prepaid_term",
            bill_interval_months=3,
            ship_interval_months=1,
            supply_days_per_shipment=30,
            is_active=True,
        )
        now = timezone.now()
        PlanPrice.objects.create(
            plan=prepaid_plan,
            amount_cents=52200,
            effective_from=now,
        )
        url = reverse("catalog:product-detail", kwargs={"slug": "weight-loss"})
        response = self.client.get(url)
        plans = response.data["plans"]
        prepaid = next((p for p in plans if p["slug"] == "sema-3month"), None)
        self.assertIsNotNone(prepaid)
        self.assertEqual(prepaid["billing_commitment"], "prepaid_term")
        self.assertEqual(prepaid["term_months"], 3)
        self.assertEqual(prepaid["bill_interval_months"], 3)
        self.assertEqual(prepaid["current_price_cents"], 52200)

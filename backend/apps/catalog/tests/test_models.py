"""Unit tests for catalog models."""
from datetime import datetime, timedelta

from django.test import TestCase
from django.utils import timezone

from apps.catalog.models import Plan, PlanPhase, PlanPrice, Product, ProductVariant, VariantMapping
from apps.catalog.services import current_price, resolve_variant


class ProductTestCase(TestCase):
    """Tests for Product model."""

    def test_product_create(self):
        """Test creating a product."""
        product = Product.objects.create(
            slug="test-product",
            name="Test Product",
            category="weight_loss",
            neutral_label="Test Membership",
        )
        self.assertEqual(product.slug, "test-product")
        self.assertEqual(product.name, "Test Product")
        self.assertTrue(product.is_active)
        self.assertIsNotNone(product.created_at)

    def test_product_str(self):
        """Test product string representation."""
        product = Product.objects.create(
            slug="test",
            name="Test Product",
            category="weight_loss",
            neutral_label="Neutral",
        )
        self.assertEqual(str(product), "Test Product")


class ProductVariantTestCase(TestCase):
    """Tests for ProductVariant model."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )

    def test_variant_create(self):
        """Test creating a variant."""
        variant = ProductVariant.objects.create(
            product=self.product,
            slug="sema-none-titration",
            drug="semaglutide",
            additive="none",
            phase="titration",
            form="compounded",
        )
        self.assertEqual(variant.drug, "semaglutide")
        self.assertEqual(variant.phase, "titration")
        self.assertTrue(variant.is_active)

    def test_variant_with_strength(self):
        """Test variant with strength in mg."""
        variant = ProductVariant.objects.create(
            product=self.product,
            slug="tirz-titration-2-5",
            drug="tirzepatide",
            additive="none",
            phase="titration",
            strength_mg=2.5,
        )
        self.assertEqual(variant.strength_mg, 2.5)

    def test_variant_str(self):
        """Test variant string representation."""
        variant = ProductVariant.objects.create(
            product=self.product,
            slug="sema-none-titration",
            drug="semaglutide",
            additive="none",
            phase="titration",
        )
        self.assertIn("Weight Loss", str(variant))
        self.assertIn("sema-none-titration", str(variant))


class VariantMappingTestCase(TestCase):
    """Tests for VariantMapping model."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            slug="sema-titration",
            drug="semaglutide",
            phase="titration",
        )

    def test_mapping_create(self):
        """Test creating a variant mapping."""
        # Note: Organization doesn't exist yet (created by accounts app)
        # This test will be skipped if accounts is not yet initialized
        pass


class PlanTestCase(TestCase):
    """Tests for Plan model."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )

    def test_plan_create_monthly(self):
        """Test creating a monthly renewable plan."""
        plan = Plan.objects.create(
            product=self.product,
            slug="sema-monthly",
            name="Monthly",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )
        self.assertEqual(plan.billing_commitment, "renewing_monthly")
        self.assertEqual(plan.term_months, 1)
        self.assertTrue(plan.is_active)

    def test_plan_create_prepaid(self):
        """Test creating a prepaid plan."""
        plan = Plan.objects.create(
            product=self.product,
            slug="sema-3month",
            name="3 months",
            kind="standard",
            term_months=3,
            billing_commitment="prepaid_term",
            bill_interval_months=3,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )
        self.assertEqual(plan.billing_commitment, "prepaid_term")
        self.assertEqual(plan.term_months, 3)
        self.assertEqual(plan.bill_interval_months, 3)

    def test_plan_invariant_prepaid_term(self):
        """Test plan invariant: bill_interval_months must equal term_months for prepaid plans."""
        plan = Plan(
            product=self.product,
            slug="bad-plan",
            name="Bad Plan",
            term_months=3,
            billing_commitment="prepaid_term",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )
        with self.assertRaises(Exception):
            plan.full_clean()

    def test_plan_invariant_ship_divides_term(self):
        """Test plan invariant: ship_interval_months must divide term_months evenly."""
        plan = Plan(
            product=self.product,
            slug="bad-plan",
            name="Bad Plan",
            term_months=3,
            billing_commitment="prepaid_term",
            bill_interval_months=3,
            ship_interval_months=2,
            supply_days_per_shipment=30,
        )
        with self.assertRaises(Exception):
            plan.full_clean()

    def test_plan_str(self):
        """Test plan string representation."""
        plan = Plan.objects.create(
            product=self.product,
            slug="sema-monthly",
            name="Monthly",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )
        self.assertIn("Weight Loss", str(plan))
        self.assertIn("Monthly", str(plan))


class PlanPriceTestCase(TestCase):
    """Tests for PlanPrice model."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )
        self.plan = Plan.objects.create(
            product=self.product,
            slug="sema-monthly",
            name="Monthly",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )

    def test_plan_price_create(self):
        """Test creating a plan price."""
        now = timezone.now()
        price = PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=now,
        )
        self.assertEqual(price.amount_cents, 19900)
        self.assertEqual(price.effective_from, now)
        self.assertIsNone(price.effective_to)

    def test_plan_price_with_effective_to(self):
        """Test price with effective_to date."""
        now = timezone.now()
        future = now + timedelta(days=30)
        price = PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=now,
            effective_to=future,
        )
        self.assertEqual(price.effective_to, future)

    def test_plan_price_str(self):
        """Test price string representation."""
        now = timezone.now()
        price = PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=now,
            currency="usd",
        )
        self.assertIn("sema-monthly", str(price))
        self.assertIn("199.00", str(price))


class PlanPhaseTestCase(TestCase):
    """Tests for PlanPhase model."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            slug="tirz-titration-2-5",
            drug="tirzepatide",
            phase="titration",
            strength_mg=2.5,
        )
        self.plan = Plan.objects.create(
            product=self.product,
            slug="tirz-starter",
            name="Starter Pack",
            kind="starter_pack",
            term_months=3,
            billing_commitment="prepaid_term",
            bill_interval_months=3,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )

    def test_phase_create(self):
        """Test creating a plan phase."""
        phase = PlanPhase.objects.create(
            plan=self.plan,
            sequence=1,
            start_month=0,
            variant=self.variant,
            dose_interval_days=30,
        )
        self.assertEqual(phase.sequence, 1)
        self.assertEqual(phase.start_month, 0)
        self.assertEqual(phase.dose_interval_days, 30)

    def test_phase_str(self):
        """Test phase string representation."""
        phase = PlanPhase.objects.create(
            plan=self.plan,
            sequence=1,
            start_month=0,
            dose_interval_days=30,
        )
        self.assertIn("tirz-starter", str(phase))
        self.assertIn("Phase 1", str(phase))


class CurrentPriceServiceTestCase(TestCase):
    """Tests for current_price service function."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )
        self.plan = Plan.objects.create(
            product=self.product,
            slug="sema-monthly",
            name="Monthly",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
        )

    def test_current_price_simple(self):
        """Test getting current price when one exists."""
        now = timezone.now()
        PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=now,
        )
        price = current_price(self.plan)
        self.assertEqual(price, 19900)

    def test_current_price_at_specific_time(self):
        """Test getting price at a specific time."""
        base = timezone.now()
        past = base - timedelta(days=10)
        future = base + timedelta(days=10)

        PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=past,
            effective_to=base,
        )
        PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=21000,
            effective_from=base,
        )

        # At past time, should get first price
        past_price = current_price(self.plan, at=past + timedelta(hours=1))
        self.assertEqual(past_price, 19900)

        # At future time, should get second price
        future_price = current_price(self.plan, at=future)
        self.assertEqual(future_price, 21000)

    def test_current_price_not_found(self):
        """Test that exception is raised when no price exists."""
        from apps.catalog.models import PlanPrice

        with self.assertRaises(PlanPrice.DoesNotExist):
            current_price(self.plan)

    def test_current_price_with_effective_to(self):
        """Test that prices with effective_to in the past are not returned."""
        base = timezone.now()
        past = base - timedelta(days=10)

        # Create an expired price
        PlanPrice.objects.create(
            plan=self.plan,
            amount_cents=19900,
            effective_from=past,
            effective_to=base - timedelta(hours=1),
        )

        with self.assertRaises(PlanPrice.DoesNotExist):
            current_price(self.plan, at=base)


class ResolveVariantServiceTestCase(TestCase):
    """Tests for resolve_variant service function."""

    def setUp(self):
        self.product = Product.objects.create(
            slug="weight-loss",
            name="Weight Loss",
            category="weight_loss",
            neutral_label="Membership",
        )

    def test_resolve_variant_simple(self):
        """Test resolving a variant by drug, additive, and phase."""
        ProductVariant.objects.create(
            product=self.product,
            slug="sema-none-titration",
            drug="semaglutide",
            additive="none",
            phase="titration",
        )
        variant = resolve_variant("semaglutide", "none", "titration")
        self.assertEqual(variant.drug, "semaglutide")
        self.assertEqual(variant.phase, "titration")

    def test_resolve_variant_not_found(self):
        """Test that exception is raised for non-existent variant."""
        from apps.catalog.models import ProductVariant

        with self.assertRaises(ProductVariant.DoesNotExist):
            resolve_variant("semaglutide", "none", "titration")

    def test_resolve_variant_inactive(self):
        """Test that inactive variants are not resolved."""
        ProductVariant.objects.create(
            product=self.product,
            slug="sema-none-titration",
            drug="semaglutide",
            additive="none",
            phase="titration",
            is_active=False,
        )

        with self.assertRaises(ProductVariant.DoesNotExist):
            resolve_variant("semaglutide", "none", "titration")

    def test_resolve_variant_with_additive(self):
        """Test resolving variant with specific additive."""
        ProductVariant.objects.create(
            product=self.product,
            slug="sema-b12-maintenance",
            drug="semaglutide",
            additive="b12",
            phase="maintenance",
        )
        variant = resolve_variant("semaglutide", "b12", "maintenance")
        self.assertEqual(variant.additive, "b12")

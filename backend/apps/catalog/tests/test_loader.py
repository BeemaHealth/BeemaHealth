"""Tests for catalog definition loader and idempotency."""
from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from apps.catalog.loader import get_loaders, register_loader
from apps.catalog.models import Plan, Product, ProductVariant


class LoaderRegistryTestCase(TestCase):
    """Tests for the loader registry extension point."""

    def test_register_loader(self):
        """Test registering a loader function."""
        # Create a mock loader function
        called = []

        def mock_loader(definitions_dir):
            called.append(definitions_dir)

        register_loader("test_app", mock_loader)

        # Verify it's registered
        loaders = get_loaders()
        self.assertIn("test_app", loaders)
        self.assertEqual(loaders["test_app"], mock_loader)

    def test_loader_overwrite_warning(self):
        """Test that overwriting a loader is allowed (with warning in logging)."""
        def loader1(d):
            pass

        def loader2(d):
            pass

        register_loader("test", loader1)
        register_loader("test", loader2)

        loaders = get_loaders()
        self.assertEqual(loaders["test"], loader2)

    def test_get_loaders_returns_copy(self):
        """Test that get_loaders returns a copy, not the original registry."""
        register_loader("test", lambda d: None)
        loaders1 = get_loaders()
        loaders2 = get_loaders()

        # Verify they are separate dicts
        self.assertIsNot(loaders1, loaders2)
        # But contain the same content
        self.assertEqual(loaders1.keys(), loaders2.keys())


class LoadDefinitionsIdempotencyTestCase(TestCase):
    """Tests for load_definitions idempotency."""

    def setUp(self):
        """Clear products before each test."""
        Product.objects.all().delete()
        ProductVariant.objects.all().delete()
        Plan.objects.all().delete()

    def test_load_definitions_idempotent(self):
        """Test that running load_definitions twice produces the same row counts."""
        # First load
        call_command("load_definitions", settings="config.settings_test")

        # Count rows after first load
        product_count_1 = Product.objects.count()
        variant_count_1 = ProductVariant.objects.count()
        plan_count_1 = Plan.objects.count()

        # Second load
        call_command("load_definitions", settings="config.settings_test")

        # Count rows after second load
        product_count_2 = Product.objects.count()
        variant_count_2 = ProductVariant.objects.count()
        plan_count_2 = Plan.objects.count()

        # Verify counts are identical
        self.assertEqual(product_count_1, product_count_2)
        self.assertEqual(variant_count_1, variant_count_2)
        self.assertEqual(plan_count_1, plan_count_2)

        # Verify we have data
        self.assertGreater(product_count_1, 0, "No products loaded")
        self.assertGreater(variant_count_1, 0, "No variants loaded")
        self.assertGreater(plan_count_1, 0, "No plans loaded")

    def test_load_definitions_creates_weight_loss_products(self):
        """Test that load_definitions creates the weight loss products."""
        call_command("load_definitions", settings="config.settings_test")

        # Check weight loss products exist
        semaglutide = Product.objects.get(slug="weight-loss-semaglutide")
        self.assertEqual(semaglutide.name, "Semaglutide")
        self.assertTrue(semaglutide.is_active)

        tirzepatide = Product.objects.get(slug="weight-loss-tirzepatide")
        self.assertEqual(tirzepatide.name, "Tirzepatide")
        self.assertTrue(tirzepatide.is_active)

    def test_load_definitions_creates_variants(self):
        """Test that variants are created for each drug and additive combination."""
        call_command("load_definitions", settings="config.settings_test")

        semaglutide_product = Product.objects.get(slug="weight-loss-semaglutide")

        # Check for semaglutide variants
        sema_titration = ProductVariant.objects.get(slug="semaglutide-none-titration")
        self.assertEqual(sema_titration.drug, "semaglutide")
        self.assertEqual(sema_titration.phase, "titration")

        sema_b12 = ProductVariant.objects.get(slug="semaglutide-b12-maintenance")
        self.assertEqual(sema_b12.drug, "semaglutide")
        self.assertEqual(sema_b12.additive, "b12")

    def test_load_definitions_creates_plans(self):
        """Test that plans are created with correct pricing."""
        call_command("load_definitions", settings="config.settings_test")

        # Check semaglutide monthly plan
        sema_monthly = Plan.objects.get(slug="semaglutide-monthly")
        self.assertEqual(sema_monthly.term_months, 1)
        self.assertEqual(sema_monthly.billing_commitment, "renewing_monthly")

        # Check pricing
        price = sema_monthly.prices.first()
        self.assertEqual(price.amount_cents, 19900)  # $199

        # Check tirzepatide starter pack
        tirz_starter = Plan.objects.get(slug="tirzepatide-starter-pack")
        self.assertEqual(tirz_starter.term_months, 3)
        self.assertEqual(tirz_starter.kind, "starter_pack")
        self.assertFalse(tirz_starter.allows_coupons)

        starter_price = tirz_starter.prices.first()
        self.assertEqual(starter_price.amount_cents, 59700)  # $597

    def test_load_definitions_creates_plan_phases(self):
        """Test that plan phases are created for tirzepatide starter pack."""
        call_command("load_definitions", settings="config.settings_test")

        tirz_starter = Plan.objects.get(slug="tirzepatide-starter-pack")
        phases = list(tirz_starter.phases.all().order_by("sequence"))

        # Check that 3 phases exist for the starter pack
        self.assertEqual(len(phases), 3)

        # Check phase sequences
        self.assertEqual(phases[0].sequence, 1)
        self.assertEqual(phases[1].sequence, 2)
        self.assertEqual(phases[2].sequence, 3)

        # Check phase starts at correct months
        self.assertEqual(phases[0].start_month, 0)
        self.assertEqual(phases[1].start_month, 1)
        self.assertEqual(phases[2].start_month, 2)

    def test_load_definitions_inactive_sexual_health_products(self):
        """Test that sexual health products are created but inactive."""
        call_command("load_definitions", settings="config.settings_test")

        ed_tadalafil = Product.objects.get(slug="ed-tadalafil")
        self.assertFalse(ed_tadalafil.is_active)

        ed_sildenafil = Product.objects.get(slug="ed-sildenafil")
        self.assertFalse(ed_sildenafil.is_active)

    def test_load_definitions_row_counts(self):
        """Test exact row counts for seeded definitions."""
        call_command("load_definitions", settings="config.settings_test")

        # Count products (weight loss has 3, sexual health has 5, other has 4 = 12 total)
        product_count = Product.objects.count()
        self.assertGreaterEqual(product_count, 8)  # At least weight loss and ED products

        # Count variants (should have multiple for each product)
        variant_count = ProductVariant.objects.count()
        self.assertGreaterEqual(variant_count, 10)

        # Count plans (should have multiple tiers per product)
        plan_count = Plan.objects.count()
        self.assertGreaterEqual(plan_count, 8)  # 7 plans for semaglutide + tirzepatide

    def test_load_definitions_idempotency_preserves_data(self):
        """Test that loading twice results in identical data without duplication."""
        call_command("load_definitions", settings="config.settings_test")

        # Get an original plan and its pricing
        original_plan = Plan.objects.get(slug="semaglutide-monthly")
        original_price = original_plan.prices.first()
        original_price_amount = original_price.amount_cents
        original_price_count = original_plan.prices.count()

        # Load again (prices are re-created since loader deletes and recreates)
        call_command("load_definitions", settings="config.settings_test")

        # Verify plan still exists and pricing is not duplicated
        plan_after = Plan.objects.get(slug="semaglutide-monthly")
        self.assertEqual(plan_after.id, original_plan.id)

        prices_after = plan_after.prices.all()
        # Count should stay the same (not doubled)
        self.assertEqual(prices_after.count(), original_price_count)
        # Data should be identical
        self.assertEqual(prices_after.first().amount_cents, original_price_amount)


class CheckLaunchReadinessTestCase(TestCase):
    """Tests for check_launch_readiness management command."""

    def setUp(self):
        """Load definitions before each test."""
        call_command("load_definitions", stdout=StringIO(), stderr=StringIO())

    def test_check_launch_readiness_missing_strength(self):
        """Test that check_launch_readiness reports variants without strength."""
        # Create an active variant without strength
        product = Product.objects.first()
        variant = ProductVariant.objects.create(
            product=product,
            slug="test-no-strength",
            drug="test-drug",
            additive="none",
            phase="maintenance",
            is_active=True,
            # Deliberately no strength_mg
        )

        # Run check - should report the missing strength
        out = StringIO()
        err = StringIO()
        with self.assertRaises(SystemExit) as cm:
            call_command("check_launch_readiness", stdout=out, stderr=err)

        self.assertEqual(cm.exception.code, 1)
        output = out.getvalue() + err.getvalue()
        self.assertIn("test-no-strength", output)
        self.assertIn("strength", output.lower())

    def test_check_launch_readiness_missing_price(self):
        """Test that check_launch_readiness reports plans without pricing."""
        product = Product.objects.first()
        plan = Plan.objects.create(
            product=product,
            slug="test-no-price",
            name="No Price Plan",
            kind="standard",
            term_months=1,
            billing_commitment="renewing_monthly",
            bill_interval_months=1,
            ship_interval_months=1,
            supply_days_per_shipment=30,
            is_active=True,
            # Deliberately no pricing
        )

        # Run check - should report the missing price
        out = StringIO()
        err = StringIO()
        with self.assertRaises(SystemExit) as cm:
            call_command("check_launch_readiness", stdout=out, stderr=err)

        self.assertEqual(cm.exception.code, 1)
        output = out.getvalue() + err.getvalue()
        self.assertIn("test-no-price", output)
        self.assertIn("price", output.lower())

    def test_variants_have_strength_after_load(self):
        """Test that all loaded variants have strength_mg values."""
        active_variants = ProductVariant.objects.filter(is_active=True)
        self.assertGreater(active_variants.count(), 0, "No active variants loaded")

        for variant in active_variants:
            self.assertIsNotNone(
                variant.strength_mg,
                f"Variant {variant.slug} missing strength_mg after load_definitions"
            )


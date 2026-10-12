import tempfile
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import Organization, User
from apps.catalog.loader import get_loaders, load_catalog_definitions
from apps.clinical.models import Treatment
from apps.clinical.tests.helpers import (
    StubbedHooksMixin, make_address, make_plan, make_product, make_profile, make_treatment, make_variant,
)
from apps.routing import engine
from apps.routing.loader import RoutingDefinitionError, load_routing_definitions
from apps.routing.models import RoutingDecision, RoutingReviewItem, RoutingRule


class LoaderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        load_catalog_definitions(settings.DEFINITIONS_DIR)

    def test_loads_beluga_weight_loss_rules(self):
        counts = load_routing_definitions(settings.DEFINITIONS_DIR)
        self.assertEqual(counts, {"organizations": 1, "rules": 3})
        beluga = Organization.objects.get(slug="beluga")
        self.assertEqual((beluga.kind, beluga.integration_adapter), ("network", "beluga"))
        slugs = set(RoutingRule.objects.values_list("product__slug", flat=True))
        self.assertEqual(slugs, {"weight-loss-glp1", "weight-loss-semaglutide", "weight-loss-tirzepatide"})
        for rule in RoutingRule.objects.all():
            self.assertEqual((rule.network, rule.states_mode, sorted(rule.states)), (beluga, "except", ["KS", "NM", "WV"]))

    def test_idempotent(self):
        load_routing_definitions(settings.DEFINITIONS_DIR)
        RoutingRule.objects.filter(name__icontains="tirzepatide").update(priority=5)
        load_routing_definitions(settings.DEFINITIONS_DIR)
        self.assertEqual(RoutingRule.objects.count(), 3)
        self.assertEqual(Organization.objects.filter(slug="beluga").count(), 1)
        self.assertEqual(RoutingRule.objects.get(name__icontains="tirzepatide").priority, 100)

    def test_seeded_rules_drive_availability(self):
        load_routing_definitions(settings.DEFINITIONS_DIR)
        from apps.catalog.models import Product

        product = Product.objects.get(slug="weight-loss-tirzepatide")
        variant = make_variant(product, "5.00")
        self.assertTrue(engine.is_available("TX", variant))
        self.assertFalse(engine.is_available("NM", variant))
        self.assertFalse(engine.is_available("WV", make_variant(product, "5.00")))

    def test_unknown_product_is_an_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "catalog").mkdir()
            (Path(tmp) / "catalog" / "routing.yaml").write_text(
                "organizations:\n  - {slug: n, kind: network, name: N}\nrules:\n  - {name: r, product_slug: nope, network_slug: n}\n"
            )
            with self.assertRaises(RoutingDefinitionError):
                load_routing_definitions(Path(tmp))

    def test_unknown_organization_is_an_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "catalog").mkdir()
            (Path(tmp) / "catalog" / "routing.yaml").write_text("rules:\n  - {name: r, network_slug: ghost}\n")
            with self.assertRaises(RoutingDefinitionError):
                load_routing_definitions(Path(tmp))

    def test_missing_file_is_not_an_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(load_routing_definitions(Path(tmp)), {"organizations": 0, "rules": 0})

    def test_management_command(self):
        out = StringIO()
        call_command("load_routing", stdout=out)
        self.assertIn("3 rules", out.getvalue())

    def test_registered_with_catalog_loader_registry(self):
        self.assertIn("routing", get_loaders())


class AdminQueueTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser("root@example.com", "pw-long-enough-123")
        self.client.force_login(self.admin)
        self.profile = make_profile()
        make_address(self.profile, "TX")
        self.product = make_product("weight-loss-glp1")
        self.variant = make_variant(self.product, "5.00")
        self.plan = make_plan(self.product, self.variant)
        self.treatment = self.new_treatment()
        self.flag = engine.route(self.treatment)

    def new_treatment(self) -> Treatment:
        return make_treatment(
            self.profile, Treatment.Status.AWAITING_VISIT_COMPLETION, product=self.product, variant=self.variant,
            plan=self.plan, requested_strength_mg=self.variant.strength_mg,
        )

    def test_queue_lists_only_open_flags(self):
        resolved = engine.route(self.new_treatment())
        RoutingDecision.objects.filter(pk=resolved.pk).update(resolved_at=self.flag.created_at)
        self.assertEqual(list(RoutingReviewItem.objects.all()), [self.flag])
        response = self.client.get(reverse("admin:routing_routingreviewitem_changelist"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([o.pk for o in response.context["cl"].result_list], [self.flag.pk])

    def test_rerun_action_routes_flag(self):
        org = Organization.objects.create(slug="beluga", name="Beluga", kind="network")
        RoutingRule.objects.create(name="fixed", product=self.product, network=org)
        url = reverse("admin:routing_routingreviewitem_changelist")
        response = self.client.post(url, {"action": "rerun_routing", "_selected_action": [str(self.flag.pk)]}, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Routed 1")
        self.flag.refresh_from_db()
        self.assertIsNotNone(self.flag.resolved_at)
        self.assertEqual(self.flag.resolved_by, self.admin)
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.network, org)
        self.assertEqual(list(RoutingReviewItem.objects.all()), [])

    def test_rerun_action_skips_resolved(self):
        engine.rerun(self.flag, self.admin)
        url = reverse("admin:routing_routingdecision_changelist")
        response = self.client.post(url, {"action": "rerun_routing", "_selected_action": [str(self.flag.pk)]}, follow=True)
        self.assertContains(response, "skipped 1")

    def test_every_model_changelist_loads(self):
        for name in (
            "clinical_treatment", "clinical_visit", "clinical_prescription", "clinical_actionitem",
            "clinical_drugineligibility", "clinical_doselog", "clinical_healthmetric",
            "routing_routingrule", "routing_routingdecision", "routing_replacementrule",
        ):
            with self.subTest(name=name):
                self.assertEqual(self.client.get(reverse(f"admin:{name}_changelist")).status_code, 200)

    def test_treatment_change_page_has_inlines(self):
        response = self.client.get(reverse("admin:clinical_treatment_change", args=[self.treatment.pk]))
        self.assertEqual(response.status_code, 200)
        names = {fs.opts.model.__name__ for fs in response.context["inline_admin_formsets"]}
        self.assertEqual(names, {"Visit", "Prescription", "DoseLog", "ActionItem", "RoutingDecision"})

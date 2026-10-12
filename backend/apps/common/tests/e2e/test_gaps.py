"""Known design level gaps found by the end to end suite. Each is an expected failure until an owner decides."""
from __future__ import annotations

import unittest
from io import StringIO

from django.core.management import call_command
from django.test import TestCase, override_settings

from apps.catalog.models import ProductVariant, VariantMapping

from .base import Actor, E2ECase, glue_buy


class VisitDataGapTests(E2ECase):
    # DESIGN GAP: the weight loss questionnaire collects no first or last name, no street address
    # and no telehealth consent, yet the Beluga mapper requires all three (and routing reads the
    # state from an Address row, which only exists once the patient adds one). With nothing but
    # the questionnaire answers the visit never reaches the network and the treatment sits in
    # awaiting_visit_completion or routing_review. Needs product/UX decision on where these are asked.
    def test_visit_reaches_the_network_with_only_questionnaire_data(self):
        actor = Actor(self)
        actor.auto_profile = False
        actor.start()
        treatment, _ = glue_buy(self, actor, "semaglutide-monthly")
        actor.run()
        treatment.refresh_from_db()
        self.assertIsNotNone(treatment.submitted_to_network_at, treatment.status)


class CatalogSeedGapTests(TestCase):
    @override_settings(DEBUG=True)
    def test_every_active_variant_is_submittable_after_a_dev_load(self):
        call_command("load_definitions", "--dev", stdout=StringIO(), stderr=StringIO())
        active = ProductVariant.objects.filter(is_active=True, product__slug__startswith="weight-loss")
        self.assertTrue(active.exists())
        for variant in active:
            self.assertIsNotNone(variant.strength_mg, variant.slug)
            self.assertTrue(VariantMapping.objects.filter(variant=variant, organization__slug="beluga").exists(), variant.slug)

    def test_plain_load_never_creates_placeholder_vendor_ids(self):
        with override_settings(DEBUG=True):
            call_command("load_definitions", stdout=StringIO(), stderr=StringIO())
        self.assertFalse(VariantMapping.objects.filter(vendor_sku__startswith="DEV-FAKE").exists())

    def test_dev_load_is_refused_when_debug_is_off(self):
        from django.core.management import CommandError

        with override_settings(DEBUG=False), self.assertRaises(CommandError):
            call_command("load_definitions", "--dev", stdout=StringIO(), stderr=StringIO())

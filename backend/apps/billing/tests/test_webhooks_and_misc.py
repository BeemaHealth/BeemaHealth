"""Stripe webhook handlers, the Stripe client factory, the data export, and admin pages."""
from __future__ import annotations

from unittest import mock

from django.contrib import admin
from django.test import SimpleTestCase, override_settings
from django.urls import reverse

from apps.accounts.models import User
from apps.billing import export, services, stripe_client, webhooks
from apps.billing.exceptions import AmountMismatch, BillingError
from apps.billing.models import Invoice, StoreCreditEntry
from apps.patients import export as patient_export

from .factories import BillingTestCase, make_coupon, make_org, make_plan, make_profile, paid_subscription

CONSENTS = ["no_cancel_after_submit", "auto_renew"]


class WebhookHandlerTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.plan = make_plan(self.product, term=3, price_cents=79100)
        self.invoice = services.create_checkout(self.patient, self.plan, consents=CONSENTS).invoice
        self.pi = self.invoice.stripe_payment_intent_id

    def test_succeeded_event_pays_the_invoice(self) -> None:
        obj = {"id": self.pi, "amount_received": 79100, "payment_method": "pm_1"}
        self.assertTrue(webhooks.dispatch("payment_intent.succeeded", obj))
        self.assertEqual(Invoice.objects.get(pk=self.invoice.pk).status, "paid")

    def test_succeeded_event_replayed_is_harmless(self) -> None:
        obj = {"id": self.pi, "amount_received": 79100}
        for _ in range(3):
            webhooks.dispatch("payment_intent.succeeded", obj)
        self.assertEqual(self.invoice.__class__.objects.get(pk=self.invoice.pk).subscription.patient_id, self.patient.pk)

    def test_wrong_amount_raises_so_integrations_marks_it_failed(self) -> None:
        with self.assertRaises(AmountMismatch):
            webhooks.dispatch("payment_intent.succeeded", {"id": self.pi, "amount_received": 5})

    def test_unknown_intent_returns_false(self) -> None:
        self.assertFalse(webhooks.dispatch("payment_intent.succeeded", {"id": "pi_other", "amount_received": 1}))

    def test_failed_event_uses_decline_code(self) -> None:
        obj = {"id": self.pi, "last_payment_error": {"code": "card_declined", "decline_code": "insufficient_funds"}}
        webhooks.dispatch("payment_intent.payment_failed", obj)
        self.assertEqual(Invoice.objects.get(pk=self.invoice.pk).failure_code, "insufficient_funds")

    def test_charge_refunded_event(self) -> None:
        webhooks.dispatch("payment_intent.succeeded", {"id": self.pi, "amount_received": 79100})
        webhooks.dispatch("charge.refunded", {"payment_intent": self.pi, "amount_refunded": 2500})
        self.assertEqual(Invoice.objects.get(pk=self.invoice.pk).refunded_cents, 2500)

    def test_charge_refunded_with_expanded_intent_object(self) -> None:
        webhooks.dispatch("payment_intent.succeeded", {"id": self.pi, "amount_received": 79100})
        webhooks.dispatch("charge.refunded", {"payment_intent": {"id": self.pi}, "amount_refunded": 100})
        self.assertEqual(Invoice.objects.get(pk=self.invoice.pk).refunded_cents, 100)

    def test_dispute_event_flags_invoice(self) -> None:
        webhooks.dispatch("payment_intent.succeeded", {"id": self.pi, "amount_received": 79100})
        webhooks.dispatch("charge.dispute.created", {"payment_intent": self.pi})
        self.assertIsNotNone(Invoice.objects.get(pk=self.invoice.pk).disputed_at)

    def test_unhandled_event_type_returns_none(self) -> None:
        self.assertIsNone(webhooks.dispatch("customer.created", {}))

    def test_malformed_payload_does_not_crash(self) -> None:
        self.assertFalse(webhooks.dispatch("payment_intent.succeeded", {}))
        self.assertFalse(webhooks.dispatch("charge.refunded", {}))
        self.assertFalse(webhooks.dispatch("charge.dispute.created", {"payment_intent": None}))


class StripeClientFactoryTests(SimpleTestCase):
    def setUp(self) -> None:
        stripe_client.set_stripe_client(None)
        self.addCleanup(stripe_client.set_stripe_client, None)

    @override_settings(STRIPE_SECRET_KEY="")
    def test_empty_key_gives_the_fake_in_tests(self) -> None:
        self.assertIsInstance(stripe_client.get_stripe_client(), stripe_client.FakeStripeClient)

    @override_settings(STRIPE_SECRET_KEY="")
    def test_empty_key_outside_tests_is_an_error(self) -> None:
        with mock.patch.dict("os.environ", {"DJANGO_SETTINGS_MODULE": "config.settings"}), self.assertRaises(BillingError) as ctx:
            stripe_client.get_stripe_client()
        self.assertEqual(ctx.exception.code, "stripe_not_configured")

    @override_settings(STRIPE_SECRET_KEY="sk_test_x")
    def test_a_key_gives_the_real_client(self) -> None:
        self.assertIsInstance(stripe_client.get_stripe_client(), stripe_client.StripeClient)

    def test_real_client_requires_a_key(self) -> None:
        with self.assertRaises(BillingError):
            stripe_client.StripeClient("")

    def test_fake_refund_cannot_exceed_charge_and_is_idempotent(self) -> None:
        fake = stripe_client.FakeStripeClient()
        pi = fake.create_payment_intent(
            amount_cents=1000, currency="usd", customer_id="cus", description="d", metadata={}, idempotency_key="k1"
        )
        again = fake.create_payment_intent(
            amount_cents=1000, currency="usd", customer_id="cus", description="d", metadata={}, idempotency_key="k1"
        )
        self.assertEqual(pi.id, again.id)
        first = fake.create_refund(payment_intent_id=pi.id, amount_cents=600, idempotency_key="r1", metadata={})
        self.assertEqual(first.id, fake.create_refund(payment_intent_id=pi.id, amount_cents=600, idempotency_key="r1", metadata={}).id)
        with self.assertRaises(BillingError):
            fake.create_refund(payment_intent_id=pi.id, amount_cents=500, idempotency_key="r2", metadata={})


class AffiliateTests(BillingTestCase):
    def test_first_touch_wins_and_unknown_links_are_ignored(self) -> None:
        from apps.billing.models import AffiliateLink

        AffiliateLink.objects.create(slug="alice", name="Alice")
        AffiliateLink.objects.create(slug="bob", name="Bob")
        AffiliateLink.objects.create(slug="off", name="Off", is_active=False)
        first = services.record_attribution(self.patient, "alice", "utm")
        second = services.record_attribution(self.patient, "bob")
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(second.affiliate.slug, "alice")
        self.assertIsNone(services.record_attribution(make_profile(), "off"))
        self.assertIsNone(services.record_attribution(make_profile(), "missing"))


class ChargeOneTimeTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        _, self.first, _ = paid_subscription(self, term=3)
        self.stripe.add_card(self.first.stripe_customer_id, "pm_ok")

    def item(self, cents: int = 4900) -> services.OneTimeItem:
        return services.OneTimeItem("Dose change fee", "Beema Health service fee", cents, product=self.product)

    def test_charges_off_session_and_marks_paid(self) -> None:
        invoice = services.charge_one_time(self.patient, [self.item()])
        self.assertEqual((invoice.kind, invoice.status, invoice.total_cents, invoice.subscription_id), ("one_time", "paid", 4900, None))
        call = [c[1] for c in self.stripe.calls if c[0] == "create_payment_intent"][-1]
        self.assertTrue(call["off_session"])
        self.assertEqual(call["description"], "Beema Health - Beema Health service fee")

    def test_declined_card_leaves_failed_invoice_and_banner(self) -> None:
        self.stripe.off_session_outcome = "failed"
        invoice = services.charge_one_time(self.patient, [self.item()])
        self.assertEqual(invoice.status, "failed")
        from apps.clinical.models import ActionItem

        self.assertTrue(ActionItem.objects.filter(patient=self.patient, kind="payment_failed", is_open=True).exists())

    def test_coupon_applies_and_is_recorded(self) -> None:
        make_coupon("FIVE", value=500)
        invoice = services.charge_one_time(self.patient, [self.item()], coupon_codes=["FIVE"])
        self.assertEqual((invoice.discount_cents, invoice.total_cents), (500, 4400))
        self.assertEqual(invoice.coupon_redemptions.count(), 1)

    def test_multiple_items_sum(self) -> None:
        invoice = services.charge_one_time(self.patient, [self.item(1000), self.item(2500)])
        self.assertEqual((invoice.total_cents, invoice.lines.count()), (3500, 2))

    def test_validation(self) -> None:
        with self.assertRaises(BillingError):
            services.charge_one_time(self.patient, [])
        with self.assertRaises(BillingError):
            services.charge_one_time(self.patient, [self.item(-1)])
        with self.assertRaises(BillingError):
            services.charge_one_time(self.patient, [self.item(10)])  # below the card minimum

    def test_payment_method_must_belong_to_the_patient(self) -> None:
        other = make_profile()
        other_customer = self.stripe.ensure_customer(patient_id=str(other.pk), email="x@example.com")
        self.stripe.add_card(other_customer, "pm_other")
        with self.assertRaises(BillingError) as ctx:
            services.charge_one_time(self.patient, [self.item()], payment_method_id="pm_other")
        self.assertEqual(ctx.exception.code, "payment_method_mismatch")

    def test_one_time_invoice_is_not_voided_by_a_new_checkout(self) -> None:
        self.stripe.off_session_outcome = "failed"
        failed = services.charge_one_time(self.patient, [self.item()])
        services.create_checkout(self.patient, make_plan(self.product, term=1), consents=CONSENTS)
        failed.refresh_from_db()
        self.assertEqual(failed.status, "failed")


class ExportTests(BillingTestCase):
    def test_contributor_is_registered_and_scoped_to_the_patient(self) -> None:
        self.assertIn(export.export_billing, patient_export.registered())
        _, invoice, _ = paid_subscription(self, term=3, price_cents=79100)
        StoreCreditEntry.objects.create(patient=self.patient, delta_cents=100, reason="goodwill")
        services.refund_invoice(invoice, 500, "goodwill")
        other = make_profile()
        data = export.export_billing(self.patient)["billing"]
        self.assertEqual(len(data["invoices"]), 1)
        self.assertEqual(len(data["invoices"][0]["lines"]), 1)
        self.assertEqual(len(data["refunds"]), 1)
        self.assertEqual(len(data["store_credit"]), 1)
        self.assertEqual(export.export_billing(other)["billing"]["invoices"], [])

    def test_full_export_includes_billing(self) -> None:
        paid_subscription(self, term=1)
        self.assertIn("billing", patient_export.build_export(self.patient))

    def test_export_excludes_nothing_non_serializable(self) -> None:
        import json

        paid_subscription(self, term=1)
        json.dumps(export.export_billing(self.patient))


class AdminTests(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.admin_user = User.objects.create_superuser("owner@example.com", "pw-not-used-1234")
        self.client.force_login(self.admin_user)

    def test_every_billing_model_is_registered(self) -> None:
        from django.apps import apps

        for model in apps.get_app_config("billing").get_models():
            self.assertTrue(admin.site.is_registered(model), model.__name__)

    def test_every_changelist_and_add_page_renders(self) -> None:
        sub, invoice, treatment = paid_subscription(self, term=3, price_cents=79100, submitted=True)
        make_coupon("ADM", value=100)
        services.refund_invoice(invoice, 100, "goodwill")
        from django.apps import apps
        from django.utils import timezone

        from apps.billing.models import VendorCost

        VendorCost.objects.create(
            treatment=treatment, vendor=make_org(), kind="visit", amount_cents=3500, incurred_at=timezone.now(), invoice=invoice
        )
        for model in apps.get_app_config("billing").get_models():
            label = model._meta.model_name
            changelist = self.client.get(reverse(f"admin:billing_{label}_changelist"))
            self.assertEqual(changelist.status_code, 200, label)
            add = self.client.get(reverse(f"admin:billing_{label}_add"))
            self.assertEqual(add.status_code, 200, label)

    def test_invoice_page_shows_margin_refunds_and_costs(self) -> None:
        from django.utils import timezone

        from apps.billing.models import VendorCost

        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        VendorCost.objects.create(
            treatment=treatment, vendor=make_org(), kind="drug", amount_cents=40000, incurred_at=timezone.now(), invoice=invoice
        )
        services.refund_invoice(invoice, 1000, "goodwill")
        page = self.client.get(reverse("admin:billing_invoice_change", args=[invoice.pk]))
        self.assertEqual(page.status_code, 200)
        html = page.content.decode()
        self.assertIn("$381.00", html)  # margin: 791 - 10 - 400
        self.assertIn("goodwill", html)

    def test_vendor_cost_changelist_shows_patient_margin(self) -> None:
        from django.utils import timezone

        from apps.billing.models import VendorCost

        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        VendorCost.objects.create(
            treatment=treatment, vendor=make_org(), kind="drug", amount_cents=40000, incurred_at=timezone.now(), invoice=invoice
        )
        html = self.client.get(reverse("admin:billing_vendorcost_changelist")).content.decode()
        self.assertIn("$391.00", html)

    def test_subscription_page_lists_invoices_inline(self) -> None:
        sub, invoice, _ = paid_subscription(self, term=3)
        html = self.client.get(reverse("admin:billing_subscription_change", args=[sub.pk])).content.decode()
        self.assertIn(str(invoice.pk), html)

    def test_coupon_page_has_redemption_inline(self) -> None:
        coupon = make_coupon("INL", value=100)
        paid_subscription(self, term=3, coupon_codes=["INL"])
        html = self.client.get(reverse("admin:billing_coupon_change", args=[coupon.pk])).content.decode()
        self.assertIn("redemptions", html)

    def test_store_credit_entries_are_append_only_in_admin(self) -> None:
        entry = StoreCreditEntry.objects.create(patient=self.patient, delta_cents=100, reason="goodwill")
        model_admin = admin.site._registry[StoreCreditEntry]
        request = type("R", (), {"user": self.admin_user})()
        self.assertFalse(model_admin.has_delete_permission(request, entry))
        self.assertIn("delta_cents", model_admin.get_readonly_fields(request, entry))

    def test_store_credit_model_blocks_updates(self) -> None:
        from django.core.exceptions import ValidationError

        entry = StoreCreditEntry.objects.create(patient=self.patient, delta_cents=100, reason="goodwill")
        entry.delta_cents = 999999
        with self.assertRaises(ValidationError):
            entry.save()

    def test_admin_refund_action_retries_failed(self) -> None:
        _, invoice, _ = paid_subscription(self, term=3, price_cents=79100)
        self.stripe.fail_next = "create_refund"
        failed = services.refund_invoice(invoice, 1000, "goodwill")
        self.assertEqual(failed.status, "failed")
        response = self.client.post(
            reverse("admin:billing_refund_changelist"),
            {"action": "retry_failed", "_selected_action": [str(failed.pk)]},
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        failed.refresh_from_db()
        self.assertEqual(failed.status, "succeeded")

    def test_str_methods_contain_no_patient_data(self) -> None:
        sub, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        refund = services.refund_invoice(invoice, 100, "goodwill")
        coupon = make_coupon("STRCODE", value=100)
        for obj in (sub, invoice, invoice.lines.first(), refund, coupon):
            self.assertNotIn(self.patient.user.email, str(obj))
            self.assertNotIn(chr(0x2014), str(obj))

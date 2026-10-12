"""Patient scoped API: behavior, validation, and cross patient isolation."""
from __future__ import annotations

from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing import services
from apps.billing.models import Invoice, StoreCreditEntry, VendorCost

from .factories import BillingTestCase, make_coupon, make_org, make_plan, make_profile, make_treatment, paid_subscription

CONSENTS = ["no_cancel_after_submit", "auto_renew"]


class ApiTestCase(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        cache.clear()
        self.client = APIClient()
        self.client.force_authenticate(self.patient.user)
        self.plan = make_plan(self.product, term=3, price_cents=79100)

    def as_patient(self, profile) -> APIClient:
        client = APIClient()
        client.force_authenticate(profile.user)
        return client

    def post(self, name: str, data: dict | None = None, client: APIClient | None = None, **kwargs):
        return (client or self.client).post(reverse(f"billing:{name}", kwargs=kwargs), data or {}, format="json")

    def get(self, name: str, client: APIClient | None = None, **kwargs):
        return (client or self.client).get(reverse(f"billing:{name}", kwargs=kwargs))


class AuthTests(ApiTestCase):
    def test_anonymous_is_rejected_everywhere(self) -> None:
        anon = APIClient()
        for name in ("quote", "checkout", "subscriptions", "invoices", "payment-methods", "credit"):
            res = anon.post(reverse(f"billing:{name}")) if name in ("quote", "checkout") else anon.get(reverse(f"billing:{name}"))
            self.assertIn(res.status_code, (401, 403), name)

    def test_staff_user_is_not_a_patient(self) -> None:
        staff = User.objects.create_user("staffer@example.com", kind="staff", is_staff=True)
        client = APIClient()
        client.force_authenticate(staff)
        self.assertEqual(client.get(reverse("billing:subscriptions")).status_code, 403)
        self.assertEqual(client.post(reverse("billing:quote"), {"plan": self.plan.slug}, format="json").status_code, 403)


class QuoteApiTests(ApiTestCase):
    def test_quote_returns_totals_and_reasons(self) -> None:
        make_coupon("TEN", kind="percent", value=10)
        res = self.post("quote", {"plan": self.plan.slug, "coupon_codes": ["TEN", "NOPE"]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual((res.data["subtotal_cents"], res.data["discount_cents"], res.data["total_cents"]), (79100, 7910, 71190))
        self.assertEqual(res.data["rejected_coupons"][0]["reason"], "unknown_code")

    def test_quote_makes_no_writes(self) -> None:
        make_coupon("TEN")
        self.post("quote", {"plan": self.plan.slug, "coupon_codes": ["TEN"]})
        self.assertEqual(Invoice.objects.count(), 0)

    def test_unknown_and_inactive_plan_404(self) -> None:
        self.assertEqual(self.post("quote", {"plan": "nope"}).status_code, 404)
        self.plan.is_active = False
        self.plan.save()
        self.assertEqual(self.post("quote", {"plan": self.plan.slug}).status_code, 404)

    def test_validation(self) -> None:
        self.assertEqual(self.post("quote", {}).status_code, 400)
        self.assertEqual(self.post("quote", {"plan": self.plan.slug, "coupon_codes": ["A"] * 6}).status_code, 400)
        self.assertEqual(self.post("quote", {"plan": self.plan.slug, "coupon_codes": ["A" * 65]}).status_code, 400)
        self.assertEqual(self.post("quote", {"plan": "../../etc/passwd"}).status_code, 400)

    def test_quote_is_rate_limited(self) -> None:
        codes = [self.post("quote", {"plan": self.plan.slug}).status_code for _ in range(31)]
        self.assertEqual(codes[-1], 429)

    def test_store_credit_flag(self) -> None:
        StoreCreditEntry.objects.create(patient=self.patient, delta_cents=1000, reason="goodwill")
        res = self.post("quote", {"plan": self.plan.slug, "use_store_credit": True})
        self.assertEqual((res.data["credit_cents"], res.data["total_cents"]), (1000, 78100))


class CheckoutApiTests(ApiTestCase):
    def test_checkout_creates_invoice_and_returns_client_secret(self) -> None:
        res = self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS})
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["client_secret"])
        invoice = Invoice.objects.get(pk=res.data["invoice_id"])
        self.assertEqual((invoice.patient_id, invoice.total_cents), (self.patient.pk, 79100))

    def test_missing_acknowledgment_is_a_400_with_code(self) -> None:
        res = self.post("checkout", {"plan": self.plan.slug, "consents": ["auto_renew"]})
        self.assertEqual((res.status_code, res.data["code"]), (400, "consent_required"))

    def test_unknown_consent_kind_is_rejected_by_validation(self) -> None:
        res = self.post("checkout", {"plan": self.plan.slug, "consents": ["no_cancel_after_submit", "terms"]})
        self.assertEqual(res.status_code, 400)

    def test_rejected_coupon_returns_quote_with_reasons(self) -> None:
        res = self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS, "coupon_codes": ["NOPE"]})
        self.assertEqual((res.status_code, res.data["code"]), (400, "coupon_rejected"))
        self.assertEqual(res.data["quote"]["rejected_coupons"][0]["reason"], "unknown_code")

    def test_cannot_check_out_against_another_patients_treatment(self) -> None:
        other = make_treatment(make_profile(), self.product)
        res = self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS, "treatment": str(other.pk)})
        self.assertEqual(res.status_code, 404)
        self.assertEqual(Invoice.objects.count(), 0)

    def test_own_treatment_is_linked(self) -> None:
        treatment = make_treatment(self.patient, self.product)
        res = self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS, "treatment": str(treatment.pk)})
        self.assertEqual(Invoice.objects.get(pk=res.data["invoice_id"]).treatment_id, treatment.pk)

    def test_stripe_outage_is_503(self) -> None:
        self.stripe.fail_next = "create_payment_intent"
        res = self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS})
        self.assertEqual((res.status_code, res.data["code"]), (503, "stripe_unavailable"))

    def test_client_cannot_set_price(self) -> None:
        res = self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS, "total_cents": 1, "amount_cents": 1})
        self.assertEqual(Invoice.objects.get(pk=res.data["invoice_id"]).total_cents, 79100)

    def test_checkout_is_rate_limited(self) -> None:
        codes = [self.post("checkout", {"plan": self.plan.slug, "consents": CONSENTS}).status_code for _ in range(11)]
        self.assertEqual(codes[-1], 429)


class IsolationTests(ApiTestCase):
    """Patient A must never read or change patient B's billing objects."""

    def setUp(self) -> None:
        super().setUp()
        self.other = make_profile()
        self.other_client = self.as_patient(self.other)
        # Build B's data with B as the logged in patient.
        saved, self.patient = self.patient, self.other
        self.sub_b, self.invoice_b, self.treatment_b = paid_subscription(self, term=1, price_cents=29700, submitted=True)
        self.patient = saved
        self.sub_a, self.invoice_a, _ = paid_subscription(self, term=1, price_cents=29700, submitted=True)

    def test_subscription_list_only_contains_own(self) -> None:
        ids = {row["id"] for row in self.get("subscriptions").data}
        self.assertEqual(ids, {str(self.sub_a.pk)})

    def test_subscription_detail_of_other_is_404(self) -> None:
        self.assertEqual(self.get("subscription-detail", pk=self.sub_b.pk).status_code, 404)
        self.assertEqual(self.get("subscription-detail", pk=self.sub_a.pk).status_code, 200)

    def test_invoice_list_only_contains_own(self) -> None:
        ids = {row["id"] for row in self.get("invoices").data["results"]} if "results" in self.get("invoices").data else {row["id"] for row in self.get("invoices").data}
        self.assertEqual(ids, {str(self.invoice_a.pk)})

    def test_invoice_detail_of_other_is_404(self) -> None:
        self.assertEqual(self.get("invoice-detail", pk=self.invoice_b.pk).status_code, 404)
        self.assertEqual(self.get("invoice-detail", pk=self.invoice_a.pk).status_code, 200)

    def test_cannot_toggle_or_cancel_another_patients_subscription(self) -> None:
        self.assertEqual(self.post("auto-renew", {"enabled": False}, pk=self.sub_b.pk).status_code, 404)
        self.assertEqual(self.post("subscription-cancel", pk=self.sub_b.pk).status_code, 404)
        self.sub_b.refresh_from_db()
        self.assertEqual((self.sub_b.status, self.sub_b.cancel_requested, self.sub_b.renews_at_term_end), ("active", False, True))

    def test_credit_balance_is_own(self) -> None:
        StoreCreditEntry.objects.create(patient=self.other, delta_cents=9999, reason="goodwill")
        self.assertEqual(self.get("credit").data["balance_cents"], 0)
        self.assertEqual(self.get("credit", client=self.other_client).data["balance_cents"], 9999)

    def test_cannot_set_another_patients_card_as_default(self) -> None:
        cust_b = self.invoice_b.stripe_customer_id
        self.stripe.add_card(cust_b, "pm_of_b", default=False)
        res = self.post("default-payment-method", {"payment_method_id": "pm_of_b"})
        self.assertEqual(res.status_code, 404)
        self.assertNotEqual(self.stripe.defaults.get(self.invoice_a.stripe_customer_id), "pm_of_b")

    def test_payment_method_list_never_shows_other_customers_cards(self) -> None:
        self.stripe.add_card(self.invoice_b.stripe_customer_id, "pm_of_b")
        self.stripe.add_card(self.invoice_a.stripe_customer_id, "pm_of_a")
        self.assertEqual([m["id"] for m in self.get("payment-methods").data], ["pm_of_a"])


class SubscriptionApiTests(ApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.sub, self.invoice, _ = paid_subscription(self, term=6, price_cents=149700, submitted=True)

    def test_serializer_hides_internal_fields(self) -> None:
        data = self.get("subscription-detail", pk=self.sub.pk).data
        for hidden in ("stripe_customer_id", "stripe_subscription_id", "treatment", "patient"):
            self.assertNotIn(hidden, data)
        self.assertIn("renews_at_term_end", data)

    def test_serializer_exposes_matching_fields_and_scopes_to_patient(self) -> None:
        _, _, treatment = paid_subscription(self, term=1)
        other = make_profile()
        saved, self.patient = self.patient, other
        paid_subscription(self, term=1)
        self.patient = saved
        rows = self.get("subscriptions").data
        rows = rows["results"] if isinstance(rows, dict) else rows
        by_treatment = {r["treatment_id"]: r for r in rows}
        self.assertIn(str(treatment.pk), by_treatment)
        self.assertEqual(len(rows), 2)  # this patient's two subscriptions only
        for key in ("plan_name", "term_months", "commitment", "next_bill_on", "next_ship_on",
                    "renews_at_term_end", "cancel_requested"):
            self.assertIn(key, by_treatment[str(treatment.pk)])

    def test_auto_renew_toggle(self) -> None:
        res = self.post("auto-renew", {"enabled": False}, pk=self.sub.pk)
        self.assertEqual((res.status_code, res.data["renews_at_term_end"]), (200, False))
        res = self.post("auto-renew", {"enabled": True}, pk=self.sub.pk)
        self.assertTrue(res.data["renews_at_term_end"])

    def test_auto_renew_requires_a_boolean(self) -> None:
        self.assertEqual(self.post("auto-renew", {}, pk=self.sub.pk).status_code, 400)
        self.assertEqual(self.post("auto-renew", {"enabled": "maybe"}, pk=self.sub.pk).status_code, 400)

    def test_cancel_after_submission_only_turns_renewal_off(self) -> None:
        res = self.post("subscription-cancel", pk=self.sub.pk)
        self.assertEqual((res.status_code, res.data["outcome"], res.data["refunded_cents"]), (200, "auto_renew_off", 0))

    def test_ended_subscription_toggle_is_409(self) -> None:
        sub, _, _ = paid_subscription(self, term=1)
        self.post("subscription-cancel", pk=sub.pk)
        self.assertEqual(self.post("auto-renew", {"enabled": True}, pk=sub.pk).status_code, 409)


class InvoiceApiTests(ApiTestCase):
    def test_invoice_payload_is_patient_safe(self) -> None:
        _, invoice, treatment = paid_subscription(self, term=3, price_cents=79100)
        VendorCost.objects.create(
            treatment=treatment, vendor=make_org(), kind="drug", amount_cents=40000, invoice=invoice,
            incurred_at=invoice.paid_at,
        )
        res = self.get("invoice-detail", pk=invoice.pk)
        body = str(res.data)
        for hidden in ("stripe_payment_intent_id", "description_internal", "vendor", "40000", "disputed_at"):
            self.assertNotIn(hidden, body)
        self.assertEqual(res.data["lines"][0]["description"], "Beema Health membership - 3 month plan")

    def test_void_invoices_are_hidden_from_the_list(self) -> None:
        services.create_checkout(self.patient, self.plan, consents=CONSENTS)
        services.create_checkout(self.patient, self.plan, consents=CONSENTS)  # voids the first
        res = self.get("invoices")
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        self.assertEqual({r["status"] for r in rows}, {"open"})
        self.assertEqual(len(rows), 1)

    def test_refunds_appear_on_the_invoice(self) -> None:
        _, invoice, _ = paid_subscription(self, term=3, price_cents=79100)
        services.refund_invoice(invoice, 1000, "goodwill")
        res = self.get("invoice-detail", pk=invoice.pk)
        self.assertEqual([r["amount_cents"] for r in res.data["refunds"]], [1000])
        self.assertEqual(res.data["refunded_cents"], 1000)


class PaymentMethodApiTests(ApiTestCase):
    def test_no_customer_yet_means_empty_list(self) -> None:
        self.assertEqual(self.get("payment-methods").data, [])

    def test_list_and_set_default(self) -> None:
        _, invoice, _ = paid_subscription(self, term=3)
        customer = invoice.stripe_customer_id
        self.stripe.add_card(customer, "pm_a", default=True)
        self.stripe.add_card(customer, "pm_b", default=False)
        rows = {r["id"]: r for r in self.get("payment-methods").data}
        self.assertTrue(rows["pm_a"]["is_default"])
        self.assertNotIn("customer", str(rows["pm_a"]))
        res = self.post("default-payment-method", {"payment_method_id": "pm_b"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.stripe.defaults[customer], "pm_b")

    def test_unknown_payment_method_404(self) -> None:
        paid_subscription(self, term=3)
        self.assertEqual(self.post("default-payment-method", {"payment_method_id": "pm_nope"}).status_code, 404)

    def test_setup_intent_creates_customer_and_returns_secret(self) -> None:
        res = self.post("setup-intent")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["client_secret"])
        self.assertEqual(len(self.stripe.customers), 1)

    def test_stripe_outage_on_list_is_503(self) -> None:
        _, invoice, _ = paid_subscription(self, term=3)

        def boom(customer_id):
            from apps.billing.exceptions import StripeUnavailable

            raise StripeUnavailable("down")

        self.stripe.list_payment_methods = boom
        self.assertEqual(self.get("payment-methods").status_code, 503)

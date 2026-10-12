"""Shared harness for the cross-app end to end suite.

Real catalog, routing and the shipped weight loss questionnaire are seeded with
``load_definitions``. Stripe, Beluga and pharmacies are fakes; everything else is the real code
path (DRF endpoints, webhook ingest, services). ``seed_vendor_data`` and ``complete_profile``
supply what the vendor and the patient must provide outside the questionnaire (see test_gaps.py).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
from decimal import Decimal
from io import StringIO
from typing import Any
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from apps.accounts.models import User
from apps.billing.models import Coupon
from apps.billing.stripe_client import FakeStripeClient, set_stripe_client
from apps.catalog.models import Plan
from apps.clinical.models import Treatment
from apps.fulfillment.pharmacy import FakePharmacyAdapter
from apps.integrations.adapters import NETWORK_ADAPTERS
from apps.integrations.adapters.beluga import BelugaAdapter, FakeBelugaTransport, TransportResponse
from apps.patients.models import PatientProfile
from apps.questionnaires.models import Submission
from apps.questionnaires.tests.flow import BASE

BELUGA_SECRET = "e2e-beluga-secret"
STRIPE_SECRET = "whsec_e2e"
PASSWORD_FREE_EMAIL = "e2e.patient@example.com"

E2E_SETTINGS = {
    "BELUGA_API_KEY": "e2e-key",
    "BELUGA_BASE_URL": "https://beluga.test",
    "BELUGA_VISIT_PATH": "/visit/create",
    "BELUGA_CHAT_PATH": "/chat/send",
    "BELUGA_WEBHOOK_SECRET": BELUGA_SECRET,
    "STRIPE_WEBHOOK_SECRET": STRIPE_SECRET,
    "INTEGRATIONS_PROCESS_INLINE": True,
    "BEEMA_PHARMACY_ROUTING_ENABLED": False,
    "DEBUG": True,  # the dev placeholder mappings load only with an explicit dev load under DEBUG
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
}


class RecordingNotifier:
    """Captures every notification instead of sending it."""

    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []

    def send(self, recipient: str, template_key: str, context: dict) -> tuple[bool, str]:
        self.sent.append({"recipient": recipient, "template_key": template_key, "context": dict(context)})
        return True, f"rec-{len(self.sent)}"

    def keys(self) -> list[str]:
        return [n["template_key"] for n in self.sent]


@override_settings(**E2E_SETTINGS)
class E2ECase(TestCase):
    """Seeds the real definitions and installs the fakes. One patient per ``Actor``."""

    def setUp(self) -> None:
        super().setUp()
        cache.clear()
        mail.outbox.clear()
        call_command("load_definitions", stdout=StringIO(), stderr=StringIO())
        self.stripe = FakeStripeClient()
        set_stripe_client(self.stripe)
        self.addCleanup(set_stripe_client, None)
        self.beluga = FakeBelugaTransport([TransportResponse(200, {"status": 200, "info": "Patient visit created successfully"})])
        self._patch(
            mock.patch.dict(NETWORK_ADAPTERS, {"beluga": lambda: BelugaAdapter(self.beluga, sleep=lambda _: None)})
        )
        FakePharmacyAdapter.reset()
        self.addCleanup(FakePharmacyAdapter.reset)
        self.notifier = RecordingNotifier()
        self._patch(mock.patch("apps.messaging.services.get_notifier", return_value=self.notifier))
        self._patch(
            mock.patch(
                "apps.messaging.management.commands.send_abandoned_checkout_emails.get_notifier", return_value=self.notifier
            )
        )
        self.seed_vendor_data()
        self._patch(
            mock.patch.multiple(
                "apps.questionnaires.storage",
                object_size=mock.Mock(return_value=2048),
                presign_upload=mock.Mock(return_value={"url": "https://s3.example/upload", "fields": {"key": "k"}}),
            )
        )

    def seed_vendor_data(self) -> None:
        """Beluga medIds are vendor supplied; load the DEV-FAKE placeholders the way `load_definitions --dev` does."""
        from django.conf import settings

        from apps.catalog.loader import load_catalog_definitions

        load_catalog_definitions(settings.DEFINITIONS_DIR, dev_mode=True)

    def _patch(self, patcher: Any) -> Any:
        started = patcher.start()
        self.addCleanup(patcher.stop)
        return started

    # ------------------------------------------------------------------ webhooks

    def post_beluga(self, payload: Any, secret: str | None = BELUGA_SECRET, client: Client | None = None):
        body = payload if isinstance(payload, (bytes, str)) else json.dumps(payload)
        headers = {"HTTP_X_WEBHOOK_SECRET": secret} if secret is not None else {}
        return (client or Client()).post("/api/v1/webhooks/beluga/", data=body, content_type="application/json", **headers)

    def post_stripe(self, event_type: str, data_object: dict[str, Any], event_id: str, secret: str = STRIPE_SECRET):
        body = json.dumps({"id": event_id, "object": "event", "type": event_type, "data": {"object": data_object}}).encode()
        ts = int(time.time())
        sig = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
        return Client().post(
            "/api/v1/webhooks/stripe/", data=body, content_type="application/json", HTTP_STRIPE_SIGNATURE=f"t={ts},v1={sig}"
        )

    def stripe_payment_succeeded(self, payment_intent_id: str, amount_cents: int, event_id: str | None = None):
        return self.post_stripe(
            "payment_intent.succeeded",
            {"id": payment_intent_id, "amount_received": amount_cents, "payment_method": "pm_e2e"},
            event_id or f"evt_{payment_intent_id}",
        )


class Actor:
    """One patient driving the real HTTP API with a cookie jar."""

    def __init__(self, case: E2ECase, email: str = PASSWORD_FREE_EMAIL) -> None:
        self.case = case
        self.email = email
        self.client = Client()
        self.answers: dict[str, Any] = {**BASE}
        self.user: User | None = None
        self.profile: PatientProfile | None = None
        self.submission_id: str | None = None
        self.auto_profile = True
        self.profile_state = "TX"

    # ------------------------------------------------------------------ account

    def sign_up(self) -> None:
        """Real passwordless flow: request a code, read it from the outbox, verify."""
        resp = self.client.post("/api/v1/auth/request-link/", {"email": self.email}, content_type="application/json")
        assert resp.status_code == 202, resp.content
        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        resp = self.client.post("/api/v1/auth/verify/", {"email": self.email, "code": code}, content_type="application/json")
        assert resp.status_code == 200, resp.content
        self.user = User.objects.get(email__iexact=self.email)
        self.profile = PatientProfile.objects.get(user=self.user)

    def login(self, user: User) -> None:
        """Skip the email round trip for patients created by other means."""
        self.client.force_login(user)
        self.user = user
        self.profile = PatientProfile.objects.get(user=user)

    # ------------------------------------------------------------------ questionnaire

    def start(self, slug: str = "weight_loss") -> dict[str, Any]:
        resp = self.client.post("/api/v1/questionnaires/start/", {"questionnaire": slug}, content_type="application/json")
        assert resp.status_code in (200, 201), resp.content
        data = resp.json()
        self.submission_id = data["submission_id"]
        return data

    def current(self) -> dict[str, Any]:
        resp = self.client.get("/api/v1/questionnaires/current/")
        assert resp.status_code == 200, resp.content
        return resp.json()

    def answer(self, node_id: str, value: Any) -> Any:
        return self.client.post(
            "/api/v1/questionnaires/answer/", {"node_id": node_id, "value": value}, content_type="application/json"
        )

    def claim(self) -> Any:
        return self.client.post("/api/v1/questionnaires/claim/", {}, content_type="application/json")

    def _upload(self, kind: str) -> str:
        resp = self.client.post(
            "/api/v1/questionnaires/upload-url/",
            {"kind": kind, "content_type": "image/jpeg", "size_bytes": 2048},
            content_type="application/json",
        )
        assert resp.status_code == 201, resp.content
        return resp.json()["file_id"]

    def run(self, until: str | None = None, overrides: dict[str, Any] | None = None, max_steps: int = 80) -> dict[str, Any]:
        """Answer the current node over and over until the flow ends or ``until`` is current.

        Stops at ``checkout`` (the caller pays) unless it is the ``until`` node. Account creation
        happens through the real sign up and claim endpoints.
        """
        self.answers.update(overrides or {})
        with self.case.captureOnCommitCallbacks(execute=True):
            return self._run(until, max_steps)

    def _run(self, until: str | None, max_steps: int) -> dict[str, Any]:
        state = self.current()
        for _ in range(max_steps):
            node = state["node"]
            node_id, kind = node["id"], node["type"]
            if state["status"] != "in_progress" or node_id == until or kind in ("checkout", "thank_you", "no_proceed"):
                return state
            if kind == "auth":
                self.sign_up()
                resp = self.claim()
                assert resp.status_code == 200, resp.content
                state = resp.json()
                if self.auto_profile:
                    self.complete_profile(self.profile_state)
                continue
            value = self.answers[node_id]
            if kind in ("file_input", "id_photo") and not (isinstance(value, dict) and value.get("skipped")):
                value = {"file_ids": [self._upload("id_photo" if kind == "id_photo" else "glp1_proof")]}
            resp = self.answer(node_id, value)
            assert resp.status_code == 200, (node_id, resp.content)
            state = resp.json()
        raise AssertionError("questionnaire did not finish")

    def submission(self) -> Submission:
        return Submission.objects.get(pk=self.submission_id)

    def complete_profile(self, state: str = "TX", zip_code: str = "77002") -> None:
        """What the visit needs but no questionnaire node collects: name, address, telehealth consent."""
        resp = self.client.patch(
            "/api/v1/auth/me/", {"first_name": "Pat", "last_name": "Tester"}, content_type="application/json"
        )
        assert resp.status_code == 200, resp.content
        self.add_address(state, zip_code)
        resp = self.client.post(
            "/api/v1/patients/consents/", {"kind": "telehealth", "version": "v1"}, content_type="application/json"
        )
        assert resp.status_code == 201, resp.content

    def add_address(self, state: str = "TX", zip_code: str = "77002") -> Any:
        """The shipping address no questionnaire node collects (see test_glue.py)."""
        resp = self.client.post(
            "/api/v1/patients/addresses/",
            {"kind": "shipping", "line1": "1 Main St", "city": "Houston", "state": state, "zip_code": zip_code, "is_default": True},
            content_type="application/json",
        )
        assert resp.status_code == 201, resp.content
        return resp

    # ------------------------------------------------------------------ billing

    def checkout(self, plan_slug: str, treatment: Treatment | None, *, coupons: tuple[str, ...] = (), auto_renew: bool = True):
        consents = ["no_cancel_after_submit"] + (["auto_renew"] if auto_renew else [])
        return self.client.post(
            "/api/v1/billing/checkout/",
            {"plan": plan_slug, "coupon_codes": list(coupons), "consents": consents,
             **({"treatment": str(treatment.pk)} if treatment else {})},
            content_type="application/json",
        )


def make_marketing_coupon(code: str = "sema-off100") -> Coupon:
    """The website promise: one time, once per patient, $100 off 3, 6 and 12 month plans, never 1 month or the starter pack."""
    return Coupon.objects.create(
        code=code, kind="fixed", value=10000, per_patient_cap=1, eligible_term_months=[3, 6, 12], excludes_starter_pack=True
    )


def plan(slug: str) -> Plan:
    return Plan.objects.get(slug=slug)


# ---------------------------------------------------------------------- scenario helpers


def treatment_of(actor: Actor) -> Treatment:
    return Treatment.objects.get(submission_id=actor.submission_id)


def glue_buy(case: E2ECase, actor: Actor, plan_slug: str, *, coupons: tuple[str, ...] = (), auto_renew: bool = True):
    """Choose the plan, check out over the API, pay through the Stripe webhook. Returns (treatment, invoice)."""
    from apps.billing.models import Invoice

    state = actor.run()
    assert state["node"]["type"] == "checkout", state["node"]["id"]
    resp = actor.answer("checkout", {"plan_slug": plan_slug})
    assert resp.status_code == 200, resp.content
    resp = actor.checkout(plan_slug, None, coupons=coupons, auto_renew=auto_renew)
    assert resp.status_code == 201, resp.content
    invoice = Invoice.objects.get(pk=resp.json()["invoice_id"])
    with case.captureOnCommitCallbacks(execute=True):
        case.stripe_payment_succeeded(invoice.stripe_payment_intent_id, invoice.total_cents)
    invoice.refresh_from_db()
    return treatment_of(actor), invoice


def beluga_event(master_id: str, event: str, **extra: Any) -> dict[str, Any]:
    return {"masterId": master_id, "event": event, **extra}


def glue_paid(case: E2ECase, plan_slug: str = "semaglutide-monthly", *, email: str = PASSWORD_FREE_EMAIL,
              overrides: dict[str, Any] | None = None, coupons: tuple[str, ...] = (), auto_renew: bool = True):
    """A patient who has paid and is on the medical questionnaire: (actor, treatment, invoice)."""
    actor = Actor(case, email)
    actor.answers.update(overrides or {})
    actor.start()
    treatment, invoice = glue_buy(case, actor, plan_slug, coupons=coupons, auto_renew=auto_renew)
    return actor, treatment, invoice


def glue_submitted(case: E2ECase, plan_slug: str = "semaglutide-monthly", **kwargs: Any):
    """A patient whose finished visit sits at the network: (actor, treatment, invoice, masterId)."""
    from apps.clinical.models import Visit

    actor, treatment, invoice = glue_paid(case, plan_slug, **kwargs)
    state = actor.run()
    assert state["node"]["type"] == "thank_you", state["node"]["id"]
    treatment.refresh_from_db()
    assert treatment.submitted_to_network_at is not None, treatment.status
    return actor, treatment, invoice, Visit.objects.get(treatment=treatment).external_id


def rx_event(master_id: str, strength: str = "0.25 mg", rx_id: str = "RX1") -> dict[str, Any]:
    return beluga_event(master_id, "RX_WRITTEN", docName="Dr. Ada Doe", medsPrescribed=[
        {"rxId": rx_id, "medId": "M1", "name": "Semaglutide", "strength": strength, "quantity": "1", "refills": "2"}])

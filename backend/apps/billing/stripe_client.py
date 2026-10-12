"""Thin Stripe wrapper plus an in-memory fake.

Rules: PaymentIntents and Customers only. Descriptions are neutral (the product's
`neutral_label`), metadata holds internal UUIDs only. No drug, condition, or plan slug
ever leaves this system.
"""
from __future__ import annotations

import itertools
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Protocol

from django.conf import settings

from .exceptions import BillingError, StripeUnavailable

logger = logging.getLogger(__name__)

STATEMENT_DESCRIPTOR_SUFFIX = "BEEMA HEALTH"


@dataclass(frozen=True)
class PaymentIntentResult:
    id: str
    status: str
    client_secret: str = ""
    payment_method_id: str = ""
    failure_code: str = ""


@dataclass(frozen=True)
class RefundResult:
    id: str
    status: str


@dataclass(frozen=True)
class PaymentMethodInfo:
    id: str
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    is_default: bool = False


class StripeClientProtocol(Protocol):
    def ensure_customer(self, *, patient_id: str, email: str, existing_id: str = "") -> str: ...
    def create_payment_intent(
        self, *, amount_cents: int, currency: str, customer_id: str, description: str,
        metadata: dict[str, str], idempotency_key: str, payment_method_id: str = "", off_session: bool = False,
    ) -> PaymentIntentResult: ...
    def cancel_payment_intent(self, payment_intent_id: str) -> None: ...
    def create_refund(
        self, *, payment_intent_id: str, amount_cents: int, idempotency_key: str, metadata: dict[str, str]
    ) -> RefundResult: ...
    def list_payment_methods(self, customer_id: str) -> list[PaymentMethodInfo]: ...
    def create_setup_intent(self, customer_id: str) -> str: ...
    def set_default_payment_method(self, customer_id: str, payment_method_id: str) -> None: ...
    def get_default_payment_method(self, customer_id: str) -> str: ...


class StripeClient:
    """Real client over the `stripe` library."""

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise BillingError("STRIPE_SECRET_KEY is not configured.", code="stripe_not_configured")
        self._api_key = api_key

    @staticmethod
    def _wrap(exc: Exception) -> StripeUnavailable:
        # Log the type only: Stripe error bodies can echo request fields.
        logger.error("stripe_call_failed type=%s", type(exc).__name__)
        return StripeUnavailable("Stripe request failed.")

    def ensure_customer(self, *, patient_id: str, email: str, existing_id: str = "") -> str:
        import stripe

        if existing_id:
            return existing_id
        try:
            customer = stripe.Customer.create(
                api_key=self._api_key,
                email=email,
                metadata={"beema_patient_id": patient_id},
                idempotency_key=f"customer-{patient_id}",
            )
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc
        return customer["id"]

    def create_payment_intent(
        self, *, amount_cents: int, currency: str, customer_id: str, description: str,
        metadata: dict[str, str], idempotency_key: str, payment_method_id: str = "", off_session: bool = False,
    ) -> PaymentIntentResult:
        import stripe

        params: dict[str, Any] = {
            "amount": amount_cents,
            "currency": currency,
            "customer": customer_id,
            "description": description,
            "statement_descriptor_suffix": STATEMENT_DESCRIPTOR_SUFFIX,
            "metadata": metadata,
            "setup_future_usage": "off_session",
            "automatic_payment_methods": {"enabled": True},
        }
        if off_session:
            params.update(
                {"off_session": True, "confirm": True, "payment_method": payment_method_id}
            )
            params.pop("setup_future_usage")
            params["automatic_payment_methods"] = {"enabled": True, "allow_redirects": "never"}
        try:
            pi = stripe.PaymentIntent.create(api_key=self._api_key, idempotency_key=idempotency_key, **params)
        except stripe.CardError as exc:
            pi_obj = (exc.error.payment_intent if exc.error else None) or {}
            return PaymentIntentResult(
                id=pi_obj.get("id", ""), status="failed", failure_code=(exc.code or "card_declined")
            )
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc
        return PaymentIntentResult(
            id=pi["id"],
            status=pi["status"],
            client_secret=pi.get("client_secret") or "",
            payment_method_id=pi.get("payment_method") or "",
        )

    def cancel_payment_intent(self, payment_intent_id: str) -> None:
        import stripe

        try:
            stripe.PaymentIntent.cancel(payment_intent_id, api_key=self._api_key)
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc

    def create_refund(
        self, *, payment_intent_id: str, amount_cents: int, idempotency_key: str, metadata: dict[str, str]
    ) -> RefundResult:
        import stripe

        try:
            refund = stripe.Refund.create(
                api_key=self._api_key,
                payment_intent=payment_intent_id,
                amount=amount_cents,
                metadata=metadata,
                idempotency_key=idempotency_key,
            )
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc
        return RefundResult(id=refund["id"], status=refund["status"])

    def list_payment_methods(self, customer_id: str) -> list[PaymentMethodInfo]:
        import stripe

        try:
            methods = stripe.PaymentMethod.list(api_key=self._api_key, customer=customer_id, type="card")
            customer = stripe.Customer.retrieve(customer_id, api_key=self._api_key)
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc
        default_id = ((customer.get("invoice_settings") or {}).get("default_payment_method")) or ""
        return [
            PaymentMethodInfo(
                id=m["id"],
                brand=m["card"]["brand"],
                last4=m["card"]["last4"],
                exp_month=m["card"]["exp_month"],
                exp_year=m["card"]["exp_year"],
                is_default=m["id"] == default_id,
            )
            for m in methods["data"]
        ]

    def create_setup_intent(self, customer_id: str) -> str:
        import stripe

        try:
            si = stripe.SetupIntent.create(
                api_key=self._api_key, customer=customer_id, usage="off_session", payment_method_types=["card"]
            )
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc
        return si["client_secret"]

    def set_default_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        import stripe

        try:
            stripe.Customer.modify(
                customer_id,
                api_key=self._api_key,
                invoice_settings={"default_payment_method": payment_method_id},
            )
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc

    def get_default_payment_method(self, customer_id: str) -> str:
        import stripe

        try:
            customer = stripe.Customer.retrieve(customer_id, api_key=self._api_key)
        except stripe.StripeError as exc:
            raise self._wrap(exc) from exc
        return ((customer.get("invoice_settings") or {}).get("default_payment_method")) or ""


@dataclass
class FakeStripeClient:
    """Deterministic in-memory Stripe for tests. Records every call for assertions."""

    customers: dict[str, dict] = field(default_factory=dict)
    payment_intents: dict[str, dict] = field(default_factory=dict)
    refunds: dict[str, dict] = field(default_factory=dict)
    payment_methods: dict[str, list[PaymentMethodInfo]] = field(default_factory=dict)
    defaults: dict[str, str] = field(default_factory=dict)
    calls: list[tuple[str, dict]] = field(default_factory=list)
    off_session_outcome: str = "succeeded"  # succeeded | failed | requires_action
    fail_next: str = ""  # method name that should raise StripeUnavailable once
    _idem: dict[str, Any] = field(default_factory=dict)
    _ids: Any = field(default_factory=lambda: itertools.count(1))

    def _next(self, prefix: str) -> str:
        return f"{prefix}_fake{next(self._ids)}"

    def _maybe_fail(self, method: str) -> None:
        if self.fail_next == method:
            self.fail_next = ""
            raise StripeUnavailable("fake failure")

    def ensure_customer(self, *, patient_id: str, email: str, existing_id: str = "") -> str:
        self.calls.append(("ensure_customer", {"patient_id": patient_id, "email": email, "existing_id": existing_id}))
        if existing_id:
            return existing_id
        key = f"customer-{patient_id}"
        if key not in self._idem:
            cid = self._next("cus")
            self._idem[key] = cid
            self.customers[cid] = {"metadata": {"beema_patient_id": patient_id}}
        return self._idem[key]

    def create_payment_intent(
        self, *, amount_cents: int, currency: str, customer_id: str, description: str,
        metadata: dict[str, str], idempotency_key: str, payment_method_id: str = "", off_session: bool = False,
    ) -> PaymentIntentResult:
        self._maybe_fail("create_payment_intent")
        self.calls.append((
            "create_payment_intent",
            {"amount_cents": amount_cents, "currency": currency, "customer_id": customer_id,
             "description": description, "metadata": dict(metadata), "idempotency_key": idempotency_key,
             "payment_method_id": payment_method_id, "off_session": off_session},
        ))
        if idempotency_key in self._idem:
            return self._idem[idempotency_key]
        pid = self._next("pi")
        if off_session:
            outcome = self.off_session_outcome
            result = PaymentIntentResult(
                id=pid, status=outcome if outcome == "succeeded" else "failed",
                payment_method_id=payment_method_id,
                failure_code="" if outcome == "succeeded" else "card_declined",
            )
            if outcome == "requires_action":
                result = PaymentIntentResult(id=pid, status="failed", failure_code="authentication_required")
        else:
            result = PaymentIntentResult(id=pid, status="requires_payment_method", client_secret=f"{pid}_secret")
        self.payment_intents[pid] = {"amount": amount_cents, "status": result.status, "metadata": dict(metadata)}
        self._idem[idempotency_key] = result
        return result

    def cancel_payment_intent(self, payment_intent_id: str) -> None:
        self._maybe_fail("cancel_payment_intent")
        self.calls.append(("cancel_payment_intent", {"payment_intent_id": payment_intent_id}))
        if payment_intent_id in self.payment_intents:
            self.payment_intents[payment_intent_id]["status"] = "canceled"

    def create_refund(
        self, *, payment_intent_id: str, amount_cents: int, idempotency_key: str, metadata: dict[str, str]
    ) -> RefundResult:
        self._maybe_fail("create_refund")
        self.calls.append((
            "create_refund",
            {"payment_intent_id": payment_intent_id, "amount_cents": amount_cents,
             "idempotency_key": idempotency_key, "metadata": dict(metadata)},
        ))
        if idempotency_key in self._idem:
            return self._idem[idempotency_key]
        pi = self.payment_intents.get(payment_intent_id)
        refunded = sum(r["amount"] for r in self.refunds.values() if r["pi"] == payment_intent_id)
        if pi is not None and refunded + amount_cents > pi["amount"]:
            raise StripeUnavailable("fake: refund exceeds charge")
        rid = self._next("re")
        self.refunds[rid] = {"pi": payment_intent_id, "amount": amount_cents}
        result = RefundResult(id=rid, status="succeeded")
        self._idem[idempotency_key] = result
        return result

    def list_payment_methods(self, customer_id: str) -> list[PaymentMethodInfo]:
        default = self.defaults.get(customer_id, "")
        return [
            PaymentMethodInfo(m.id, m.brand, m.last4, m.exp_month, m.exp_year, m.id == default)
            for m in self.payment_methods.get(customer_id, [])
        ]

    def create_setup_intent(self, customer_id: str) -> str:
        self.calls.append(("create_setup_intent", {"customer_id": customer_id}))
        return f"seti_{customer_id}_secret"

    def set_default_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        self.calls.append(("set_default_payment_method", {"customer_id": customer_id, "pm": payment_method_id}))
        self.defaults[customer_id] = payment_method_id

    def get_default_payment_method(self, customer_id: str) -> str:
        return self.defaults.get(customer_id, "")

    def add_card(self, customer_id: str, pm_id: str = "pm_fake1", *, default: bool = True) -> None:
        """Test helper: attach a card to a customer."""
        self.payment_methods.setdefault(customer_id, []).append(PaymentMethodInfo(pm_id, "visa", "4242", 12, 2030))
        if default:
            self.defaults[customer_id] = pm_id


_client_override: StripeClientProtocol | None = None


def set_stripe_client(client: StripeClientProtocol | None) -> None:
    """Install (or clear with None) a process wide client. Used by tests."""
    global _client_override
    _client_override = client


def _is_test_run() -> bool:
    return os.environ.get("DJANGO_SETTINGS_MODULE", "").endswith("settings_test")


def get_stripe_client() -> StripeClientProtocol:
    """Return the active client. A missing key yields the fake in tests and an error elsewhere."""
    global _client_override
    if _client_override is not None:
        return _client_override
    key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if key:
        return StripeClient(key)
    if _is_test_run():
        _client_override = FakeStripeClient()
        return _client_override
    raise BillingError("STRIPE_SECRET_KEY is not configured.", code="stripe_not_configured")

"""Patient scoped billing API. Every queryset is filtered by the logged in patient."""
from __future__ import annotations

import logging

from django.apps import apps as django_apps
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient, get_patient_profile

from . import pricing, services
from .exceptions import BillingError, CheckoutError, CouponRejected, PricingError, StripeUnavailable
from .models import Invoice, Subscription
from .serializers import (
    AutoRenewSerializer,
    CheckoutRequestSerializer,
    DefaultPaymentMethodSerializer,
    InvoiceSerializer,
    QuoteRequestSerializer,
    SubscriptionSerializer,
)
from .stripe_client import get_stripe_client

logger = logging.getLogger(__name__)


class QuoteThrottle(UserRateThrottle):
    """Coupon preview is a code guessing oracle, so it gets a tight limit."""

    scope = "billing_quote"
    rate = "30/min"


class CheckoutThrottle(UserRateThrottle):
    scope = "billing_checkout"
    rate = "10/min"


def _get_plan(slug: str):
    Plan = django_apps.get_model("catalog", "Plan")
    return get_object_or_404(Plan.objects.select_related("product"), slug=slug, is_active=True)


def _error(exc: BillingError, http_status: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({"code": exc.code, "detail": str(exc)}, status=http_status)


class QuoteView(APIView):
    permission_classes = [IsPatient]
    throttle_classes = [QuoteThrottle]

    def post(self, request) -> Response:
        patient = get_patient_profile(request.user)
        data = QuoteRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        plan = _get_plan(data.validated_data["plan"])
        try:
            quote = pricing.quote(
                patient, plan, data.validated_data["coupon_codes"], data.validated_data["use_store_credit"]
            )
        except PricingError as exc:
            return _error(exc)
        return Response(quote.as_dict())


class CheckoutView(APIView):
    permission_classes = [IsPatient]
    throttle_classes = [CheckoutThrottle]

    def post(self, request) -> Response:
        patient = get_patient_profile(request.user)
        data = CheckoutRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        valid = data.validated_data
        plan = _get_plan(valid["plan"])
        treatment = None
        if valid["treatment"]:
            Treatment = django_apps.get_model("clinical", "Treatment")
            treatment = get_object_or_404(Treatment, pk=valid["treatment"], patient=patient)
        try:
            result = services.create_checkout(
                patient, plan, valid["coupon_codes"], use_store_credit=valid["use_store_credit"],
                consents=valid["consents"], treatment=treatment, ip=_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
        except CouponRejected as exc:
            return Response(
                {"code": exc.code, "detail": str(exc), "quote": exc.quote.as_dict()}, status=status.HTTP_400_BAD_REQUEST
            )
        except StripeUnavailable as exc:
            return _error(exc, status.HTTP_503_SERVICE_UNAVAILABLE)
        except (CheckoutError, PricingError) as exc:
            return _error(exc)
        return Response(
            {
                "invoice_id": str(result.invoice.pk),
                "client_secret": result.client_secret,
                "requires_payment": result.requires_payment,
                "quote": result.quote.as_dict(),
            },
            status=status.HTTP_201_CREATED,
        )


def _client_ip(request) -> str | None:
    from apps.common.utils import client_ip

    return client_ip(request)


class SubscriptionListView(ListAPIView):
    permission_classes = [IsPatient]
    serializer_class = SubscriptionSerializer
    pagination_class = None

    def get_queryset(self):
        return Subscription.objects.filter(patient=get_patient_profile(self.request.user)).select_related("plan")


class SubscriptionDetailView(RetrieveAPIView):
    permission_classes = [IsPatient]
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return Subscription.objects.filter(patient=get_patient_profile(self.request.user)).select_related("plan")


class AutoRenewView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk) -> Response:
        patient = get_patient_profile(request.user)
        subscription = get_object_or_404(Subscription, pk=pk, patient=patient)
        data = AutoRenewSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            updated = services.set_auto_renew(
                subscription, data.validated_data["enabled"], ip=_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
        except BillingError as exc:
            return _error(exc, status.HTTP_409_CONFLICT)
        return Response(SubscriptionSerializer(updated).data)


class CancelSubscriptionView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk) -> Response:
        patient = get_patient_profile(request.user)
        subscription = get_object_or_404(Subscription, pk=pk, patient=patient)
        try:
            result = services.request_cancel(subscription, request.user)
        except BillingError as exc:
            return _error(exc, status.HTTP_409_CONFLICT)
        subscription.refresh_from_db()
        return Response(
            {"outcome": result.outcome, "refunded_cents": result.refunded_cents,
             "subscription": SubscriptionSerializer(subscription).data}
        )


class InvoiceListView(ListAPIView):
    permission_classes = [IsPatient]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        return (
            Invoice.objects.filter(patient=get_patient_profile(self.request.user))
            .exclude(status__in=[Invoice.Status.VOID, Invoice.Status.DRAFT])
            .prefetch_related("lines", "refunds")
        )


class InvoiceDetailView(RetrieveAPIView):
    permission_classes = [IsPatient]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        return Invoice.objects.filter(patient=get_patient_profile(self.request.user)).prefetch_related("lines", "refunds")


class PaymentMethodListView(APIView):
    permission_classes = [IsPatient]

    def get(self, request) -> Response:
        customer = services.existing_customer_id(get_patient_profile(request.user))
        if not customer:
            return Response([])
        try:
            methods = get_stripe_client().list_payment_methods(customer)
        except StripeUnavailable as exc:
            return _error(exc, status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(
            [{"id": m.id, "brand": m.brand, "last4": m.last4, "exp_month": m.exp_month, "exp_year": m.exp_year,
              "is_default": m.is_default} for m in methods]
        )


class SetupIntentView(APIView):
    """Start adding a card. The browser confirms the SetupIntent with Stripe.js."""

    permission_classes = [IsPatient]
    throttle_classes = [CheckoutThrottle]

    def post(self, request) -> Response:
        try:
            customer = services.get_or_create_customer(get_patient_profile(request.user))
            secret = get_stripe_client().create_setup_intent(customer)
        except StripeUnavailable as exc:
            return _error(exc, status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"client_secret": secret})


class DefaultPaymentMethodView(APIView):
    permission_classes = [IsPatient]

    def post(self, request) -> Response:
        patient = get_patient_profile(request.user)
        data = DefaultPaymentMethodSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        method_id = data.validated_data["payment_method_id"]
        customer = services.existing_customer_id(patient)
        try:
            client = get_stripe_client()
            owned = {m.id for m in client.list_payment_methods(customer)} if customer else set()
            if method_id not in owned:
                return Response({"code": "payment_method_not_found", "detail": "Unknown payment method."}, status=404)
            client.set_default_payment_method(customer, method_id)
        except StripeUnavailable as exc:
            return _error(exc, status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"id": method_id, "is_default": True})


class StoreCreditView(APIView):
    permission_classes = [IsPatient]

    def get(self, request) -> Response:
        patient = get_patient_profile(request.user)
        return Response({"balance_cents": pricing.store_credit_balance(patient)})

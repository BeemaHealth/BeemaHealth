import logging

import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.payments.models import StripePaymentMethod, StripeWebhookEvent
from apps.payments.serializers import (
    AuthorizationHoldSerializer,
    StripePaymentMethodSerializer,
)
from apps.payments.services import (
    IllegalStateTransition,
    PaymentNotConfigured,
    StripeApiUnavailable,
    apply_stripe_webhook,
    cancel_hold,
    create_or_get_hold,
    get_active_hold,
    get_client_secret,
)

logger = logging.getLogger(__name__)

PAYMENT_NOT_CONFIGURED_MESSAGE = "Payment isn't available at this step yet. Please refresh and try again."
GENERIC_STRIPE_ERROR_MESSAGE = "Something went wrong processing payment. Please try again."


class PaymentHoldThrottle(UserRateThrottle):
    scope = "payment_hold"


class PaymentHoldChangeCardThrottle(UserRateThrottle):
    scope = "payment_hold_change_card"


def _hold_response(hold, status_code=status.HTTP_200_OK):
    try:
        client_secret = get_client_secret(hold)
    except StripeApiUnavailable:
        client_secret = None
    data = AuthorizationHoldSerializer(hold, context={"client_secret": client_secret}).data
    return Response(data, status=status_code)


class PaymentHoldCreateView(APIView):
    permission_classes = [IsPatient]
    throttle_classes = [PaymentHoldThrottle]

    def post(self, request):
        if not settings.PAYMENTS_ENABLED:
            return Response(
                {"detail": "Payments are not enabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        already_active = get_active_hold(request.user) is not None
        try:
            hold = create_or_get_hold(request.user)
        except PaymentNotConfigured:
            return Response(
                {"detail": PAYMENT_NOT_CONFIGURED_MESSAGE},
                status=status.HTTP_409_CONFLICT,
            )
        except StripeApiUnavailable:
            return Response(
                {"detail": GENERIC_STRIPE_ERROR_MESSAGE},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        response_status = status.HTTP_200_OK if already_active else status.HTTP_201_CREATED
        return _hold_response(hold, response_status)


class PaymentHoldMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        hold = get_active_hold(request.user)
        if hold is None:
            return Response(None, status=status.HTTP_200_OK)
        return _hold_response(hold)


class PaymentHoldChangeCardView(APIView):
    permission_classes = [IsPatient]
    throttle_classes = [PaymentHoldChangeCardThrottle]

    def post(self, request):
        if not settings.PAYMENTS_ENABLED:
            return Response(
                {"detail": "Payments are not enabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        hold = get_active_hold(request.user)
        if hold is None:
            return Response(
                {"detail": "No active hold to update."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            cancel_hold(hold, reason="card_change")
            new_hold = create_or_get_hold(request.user)
        except (StripeApiUnavailable, IllegalStateTransition):
            return Response(
                {"detail": GENERIC_STRIPE_ERROR_MESSAGE},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except PaymentNotConfigured:
            return Response(
                {"detail": PAYMENT_NOT_CONFIGURED_MESSAGE},
                status=status.HTTP_409_CONFLICT,
            )
        return _hold_response(new_hold, status.HTTP_201_CREATED)


class PaymentMethodListView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        methods = StripePaymentMethod.objects.filter(user=request.user)
        return Response(StripePaymentMethodSerializer(methods, many=True).data)


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.headers.get("Stripe-Signature", "")
        if not settings.STRIPE_WEBHOOK_SECRET:
            return Response({"detail": "Webhook not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            logger.warning("[STRIPE WEBHOOK] rejected: invalid payload or signature")
            return Response({"detail": "Invalid payload or signature."}, status=status.HTTP_400_BAD_REQUEST)

        event_id = event["id"]
        _, created = StripeWebhookEvent.objects.get_or_create(
            stripe_event_id=event_id, defaults={"event_type": event["type"]}
        )
        if not created:
            logger.info("[STRIPE WEBHOOK] duplicate event=%s type=%s", event_id, event["type"])
            return Response({"handled": False, "duplicate": True}, status=status.HTTP_200_OK)

        logger.info("[STRIPE WEBHOOK] received event=%s type=%s", event_id, event["type"])
        result = apply_stripe_webhook(event)
        return Response(result, status=status.HTTP_200_OK)

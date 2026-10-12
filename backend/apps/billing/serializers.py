"""Patient facing serializers. Internal descriptions, vendor costs, and Stripe ids are never exposed."""
from __future__ import annotations

from rest_framework import serializers

from .models import Invoice, InvoiceLine, Refund, Subscription


class QuoteRequestSerializer(serializers.Serializer):
    plan = serializers.SlugField(max_length=64)
    coupon_codes = serializers.ListField(child=serializers.CharField(max_length=64), required=False, max_length=5, default=list)
    use_store_credit = serializers.BooleanField(required=False, default=False)


class CheckoutRequestSerializer(QuoteRequestSerializer):
    consents = serializers.ListField(
        child=serializers.ChoiceField(choices=["no_cancel_after_submit", "auto_renew"]), required=False, default=list
    )
    treatment = serializers.UUIDField(required=False, allow_null=True, default=None)


class AutoRenewSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()


class DefaultPaymentMethodSerializer(serializers.Serializer):
    payment_method_id = serializers.CharField(max_length=64)


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    treatment_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "treatment_id", "plan_name", "status", "commitment", "term_months", "term_starts_on", "term_ends_on", "paid_through",
            "next_bill_on", "next_ship_on", "batches_total", "batches_shipped", "cancel_requested",
            "cancel_effective_on", "renews_at_term_end",
        ]
        read_only_fields = fields


class InvoiceLineSerializer(serializers.ModelSerializer):
    description = serializers.CharField(source="neutral_description", read_only=True)

    class Meta:
        model = InvoiceLine
        fields = ["description", "amount_cents"]
        read_only_fields = fields


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ["id", "amount_cents", "status", "created_at"]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    refunds = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "kind", "status", "currency", "subtotal_cents", "discount_cents", "credit_cents", "total_cents",
            "refunded_cents", "paid_at", "created_at", "subscription", "lines", "refunds",
        ]
        read_only_fields = fields

    def get_refunds(self, obj: Invoice) -> list[dict]:
        done = [r for r in obj.refunds.all() if r.status == Refund.Status.SUCCEEDED]
        return RefundSerializer(done, many=True).data

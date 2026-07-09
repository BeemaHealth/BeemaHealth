from rest_framework import serializers

from apps.payments.models import AuthorizationHold, StripePaymentMethod


class AuthorizationHoldSerializer(serializers.ModelSerializer):
    client_secret = serializers.SerializerMethodField()

    class Meta:
        model = AuthorizationHold
        fields = [
            "id",
            "payment_mode",
            "amount_cents",
            "status",
            "status_reason",
            "captured_amount_cents",
            "held_at",
            "captured_at",
            "canceled_at",
            "expires_at",
            "created_at",
            "client_secret",
        ]
        read_only_fields = fields

    def get_client_secret(self, obj: AuthorizationHold) -> str | None:
        return self.context.get("client_secret")


class StripePaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = StripePaymentMethod
        fields = [
            "id",
            "card_brand",
            "card_last4",
            "card_exp_month",
            "card_exp_year",
            "is_default",
            "created_at",
        ]
        read_only_fields = fields

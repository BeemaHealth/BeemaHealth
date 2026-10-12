from rest_framework import serializers

from .models import Order, Shipment, ShipmentBatch


class ShipmentSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Shipment
        fields = ["id", "order_id", "carrier", "tracking_number", "tracking_url", "status", "shipped_at", "delivered_on"]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    treatment_id = serializers.UUIDField(read_only=True)
    shipments = ShipmentSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "treatment_id", "status", "fill_type", "submitted_at", "created_at", "shipments"]
        read_only_fields = fields


class NextShipmentSerializer(serializers.ModelSerializer):
    treatment_id = serializers.SerializerMethodField()
    blocked_reason = serializers.CharField(read_only=True)

    class Meta:
        model = ShipmentBatch
        fields = ["id", "treatment_id", "sequence", "due_on", "supply_days", "status", "blocked_reason"]
        read_only_fields = fields

    def get_treatment_id(self, obj: ShipmentBatch):
        return obj.subscription.treatment_id


class RefillRequestSerializer(serializers.Serializer):
    treatment = serializers.UUIDField()

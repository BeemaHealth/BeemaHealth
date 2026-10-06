from django.shortcuts import get_object_or_404
from rest_framework import serializers

from apps.pharmacy.models import PharmacyOrder


class PharmacyOrderSerializer(serializers.ModelSerializer):
    prescription_id = serializers.UUIDField(source="prescription.id", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = PharmacyOrder
        fields = [
            "id",
            "prescription_id",
            "user_id",
            "pharmacy_partner",
            "external_order_id",
            "external_reference_id",
            "status",
            "recipient_type",
            "ship_to_city",
            "ship_to_state",
            "ship_to_zip_code",
            "ship_to_country",
            "tracking_number",
            "carrier",
            "error_message",
            "submitted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = str(instance.id)
        data["prescription_id"] = str(instance.prescription_id)
        data["user_id"] = str(instance.user_id)
        if instance.submitted_at:
            data["submitted_at"] = instance.submitted_at.isoformat()
        if instance.created_at:
            data["created_at"] = instance.created_at.isoformat()
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()
        return data

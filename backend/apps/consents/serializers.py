from django.utils import timezone
from rest_framework import serializers

from apps.consents.models import ConsentRecord


class ConsentRecordSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ConsentRecord
        fields = [
            "id",
            "user_id",
            "telehealth_consent",
            "no_guarantee_acknowledgment",
            "emergency_disclaimer_acknowledgment",
            "medication_risk_acknowledgment",
            "compounded_medication_acknowledgment",
            "privacy_acknowledgment",
            "typed_signature",
            "signed_at",
        ]
        read_only_fields = ["id", "user_id", "signed_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        data["signed_at"] = instance.signed_at.isoformat()
        return data

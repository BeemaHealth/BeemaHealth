from django.utils import timezone
from rest_framework import serializers

from apps.common.validation.form import is_filled, is_valid_person_name
from apps.consents.models import ConsentRecord


class ConsentRecordSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)

    _REQUIRED_ACK_FIELDS = (
        "telehealth_consent",
        "no_guarantee_acknowledgment",
        "emergency_disclaimer_acknowledgment",
        "medication_risk_acknowledgment",
        "compounded_medication_acknowledgment",
    )

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
        read_only_fields = ["id", "user_id", "signed_at", "privacy_acknowledgment"]

    def validate(self, attrs):
        errors: dict[str, str] = {}
        for field in self._REQUIRED_ACK_FIELDS:
            if attrs.get(field) is not True:
                errors[field] = "This acknowledgment is required."

        signature = attrs.get("typed_signature", getattr(self.instance, "typed_signature", ""))
        if not is_filled(signature):
            errors["typed_signature"] = "Enter your full legal name as signature."
        elif not is_valid_person_name(str(signature)):
            errors["typed_signature"] = "Enter a valid signature name."

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        data["signed_at"] = instance.signed_at.isoformat()
        return data

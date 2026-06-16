from django.utils import timezone
from rest_framework import serializers

from apps.intakes.models import MedicalIntake


class MedicalIntakeSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = MedicalIntake
        fields = [
            "id",
            "user_id",
            "status",
            "identity",
            "body_metrics",
            "weight_history",
            "medical_conditions",
            "family_history",
            "medications",
            "allergies",
            "pregnancy",
            "lifestyle",
            "labs",
            "medication_preferences",
            "safety_acknowledgments",
            "submitted_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "submitted_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()
        if instance.submitted_at:
            data["submitted_at"] = instance.submitted_at.isoformat()
        return data

    def validate_status(self, value):
        if self.instance and self.instance.status == "submitted" and value == "draft":
            raise serializers.ValidationError("Cannot revert submitted intake to draft.")
        return value

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        if status == "submitted" and not instance.submitted_at:
            validated_data["submitted_at"] = timezone.now()
        return super().update(instance, validated_data)

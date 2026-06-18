from django.utils import timezone
from rest_framework import serializers

from apps.eligibility.models import EligibilityResponse
from apps.eligibility.services import derive_eligibility_flags
from apps.intakes.deduplication import dedupe_intake_payload
from apps.intakes.models import MedicalIntake
from apps.patients.services import sync_patient_profile_from_intake


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

    def _dedupe(self, attrs: dict) -> dict:
        user = self.context.get("user") or (self.instance.user if self.instance else None)
        eligibility = EligibilityResponse.objects.filter(user=user).first() if user else None
        return dedupe_intake_payload(attrs, user, eligibility)

    def validate(self, attrs):
        attrs = self._dedupe(attrs)
        return super().validate(attrs)

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

    def create(self, validated_data):
        intake = super().create(validated_data)
        sync_patient_profile_from_intake(intake.user, intake.identity)
        return intake

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        if status == "submitted" and not instance.submitted_at:
            validated_data["submitted_at"] = timezone.now()
        intake = super().update(instance, validated_data)
        sync_patient_profile_from_intake(intake.user, intake.identity)
        return intake

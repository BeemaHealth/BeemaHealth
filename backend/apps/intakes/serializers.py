from django.utils import timezone
from rest_framework import serializers

from apps.common.validation.intake import validate_intake_payload
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.services import derive_eligibility_flags
from apps.intakes.deduplication import dedupe_intake_payload
from apps.intakes.models import MedicalIntake, SideEffectCheckIn
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

        user = self.context.get("user") or (self.instance.user if self.instance else None)
        eligibility = EligibilityResponse.objects.filter(user=user).first() if user else None
        current_weight = str(eligibility.weight_lbs) if eligibility and eligibility.weight_lbs is not None else None

        intake_errors = validate_intake_payload(attrs, current_weight=current_weight)
        if intake_errors:
            raise serializers.ValidationError(intake_errors)

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


class SideEffectCheckInSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = SideEffectCheckIn
        fields = ["id", "user_id", "side_effect", "experienced_on", "created_at"]
        read_only_fields = ["id", "user_id", "created_at"]

    def validate_side_effect(self, value):
        allowed = {choice[0] for choice in SideEffectCheckIn.SIDE_EFFECT_CHOICES}
        if value not in allowed:
            raise serializers.ValidationError("Invalid side effect.")
        return value

    def validate_experienced_on(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Date cannot be in the future.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        data["experienced_on"] = instance.experienced_on.isoformat()
        if instance.created_at:
            data["created_at"] = instance.created_at.isoformat()
        return data

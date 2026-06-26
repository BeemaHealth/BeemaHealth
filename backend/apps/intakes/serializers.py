from django.utils import timezone
from rest_framework import serializers

from apps.common.validation.intake import validate_intake_payload
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.services import derive_eligibility_flags
from apps.intakes.deduplication import dedupe_intake_payload
from apps.intakes.models import IntakeSubmission, MedicalIntake, SideEffectCheckIn
from apps.intakes.permissions import patient_can_edit_intake
from apps.intakes.questionnaire_sync import sync_canonical_fields_from_questionnaire
from apps.intakes.screening import ensure_account_screening
from apps.patients.services import sync_patient_profile_from_intake
from apps.questionnaires.validation import validate_responses_against_version


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
            "account_screening",
            "questionnaire_responses",
            "questionnaire_version_id",
            "submitted_at",
            "active_submission_version",
            "working_version",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "submitted_at",
            "active_submission_version",
            "working_version",
            "account_screening",
            "updated_at",
        ]

    def _dedupe(self, attrs: dict) -> dict:
        user = self.context.get("user") or (self.instance.user if self.instance else None)
        eligibility = EligibilityResponse.objects.filter(user=user).first() if user else None
        return dedupe_intake_payload(attrs, user, eligibility)

    def validate(self, attrs):
        if self.instance and not patient_can_edit_intake(self.instance):
            raise serializers.ValidationError(
                "This intake cannot be edited. Contact your care team if changes are needed."
            )
        attrs = self._dedupe(attrs)

        user = self.context.get("user") or (self.instance.user if self.instance else None)
        eligibility = EligibilityResponse.objects.filter(user=user).first() if user else None
        current_weight = str(eligibility.weight_lbs) if eligibility and eligibility.weight_lbs is not None else None

        intake_errors = validate_intake_payload(attrs, current_weight=current_weight)
        if intake_errors:
            raise serializers.ValidationError(intake_errors)

        responses = attrs.get("questionnaire_responses")
        version_id = attrs.get("questionnaire_version_id")
        if self.instance:
            if version_id is None:
                version_id = self.instance.questionnaire_version_id
            if "questionnaire_version_id" in attrs and self.instance.questionnaire_version_id:
                if str(attrs["questionnaire_version_id"]) != str(
                    self.instance.questionnaire_version_id
                ):
                    raise serializers.ValidationError(
                        {"questionnaire_version_id": "Questionnaire version cannot be changed."}
                    )
        if responses is not None and version_id:
            # Only enforce completeness (required fields) at final submission.
            # Incremental/draft saves — including the one-time auto-sync that
            # stamps questionnaire_version_id — validate the format of provided
            # answers but must not reject unanswered required fields, otherwise
            # loading a partially complete intake fails.
            resulting_status = attrs.get(
                "status", self.instance.status if self.instance else "draft"
            )
            q_errors = validate_responses_against_version(
                version_id,
                responses,
                enforce_required=(resulting_status == "submitted"),
            )
            if q_errors:
                raise serializers.ValidationError({"questionnaire_responses": q_errors})

        return super().validate(attrs)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()
        if instance.submitted_at:
            data["submitted_at"] = instance.submitted_at.isoformat()
        if not instance.account_screening:
            data["account_screening"] = ensure_account_screening(instance)
        return data

    def validate_status(self, value):
        if self.instance and self.instance.status == "submitted" and value == "draft":
            raise serializers.ValidationError("Cannot revert submitted intake to draft.")
        return value

    def create(self, validated_data):
        intake = super().create(validated_data)
        sync_canonical_fields_from_questionnaire(intake)
        if intake.status == "draft":
            sync_patient_profile_from_intake(
                intake.user, intake.identity, intake.medication_preferences
            )
        return intake

    def update(self, instance, validated_data):
        status = validated_data.get("status", instance.status)
        if status == "submitted" and not instance.submitted_at:
            validated_data["submitted_at"] = timezone.now()
        intake = super().update(instance, validated_data)
        sync_canonical_fields_from_questionnaire(intake)
        if intake.status == "draft":
            sync_patient_profile_from_intake(
                intake.user, intake.identity, intake.medication_preferences
            )
        return intake


class IntakeSubmissionSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)
    medical_intake_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = IntakeSubmission
        fields = [
            "id",
            "user_id",
            "medical_intake_id",
            "version",
            "status_at_submit",
            "snapshot",
            "submitted_at",
            "created_at",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        data["medical_intake_id"] = str(instance.medical_intake_id)
        if instance.submitted_at:
            data["submitted_at"] = instance.submitted_at.isoformat()
        if instance.created_at:
            data["created_at"] = instance.created_at.isoformat()
        return data


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

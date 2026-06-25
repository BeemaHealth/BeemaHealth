from rest_framework import serializers

from apps.common.validation.eligibility import validate_eligibility_fields
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.services import derive_eligibility_flags
from apps.intakes.services import compute_bmi
from apps.patients.models import PatientProfile


class EligibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = EligibilityResponse
        fields = [
            "id",
            "user_id",
            "funnel_session_id",
            "treatment_interest",
            "primary_goal",
            "treatment_priority",
            "target_weight_loss_range",
            "state",
            "dob",
            "is_18_or_older",
            "height_ft",
            "height_in",
            "weight_lbs",
            "goal_weight_lbs",
            "bmi",
            "sex_assigned_at_birth",
            "gender_identity",
            "safety_screen",
            "safety_concern_flag",
            "is_likely_eligible",
            "needs_clinician_review",
            "disqualification_reason",
            "pre_signup_consents",
            "questionnaire_responses",
            "questionnaire_version_id",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "funnel_session_id",
            "bmi",
            "safety_concern_flag",
            "is_likely_eligible",
            "needs_clinician_review",
            "disqualification_reason",
            "created_at",
            "updated_at",
        ]

    _CLAIMED_IDENTITY_FIELDS = ("dob", "state", "sex_assigned_at_birth", "gender_identity")

    def validate(self, attrs):
        if self.instance and self.instance.user_id:
            for field in self._CLAIMED_IDENTITY_FIELDS:
                attrs.pop(field, None)

        is_adult = attrs.get(
            "is_18_or_older",
            getattr(self.instance, "is_18_or_older", None) if self.instance else None,
        )
        if is_adult is False:
            raise serializers.ValidationError(
                "Aretide is currently only available for adults 18 and older."
            )

        field_errors = validate_eligibility_fields(attrs, self.instance)
        if field_errors:
            raise serializers.ValidationError(field_errors)

        return attrs

    def _apply_bmi(self, instance: EligibilityResponse) -> None:
        if instance.height_ft is not None and instance.weight_lbs is not None:
            instance.bmi = compute_bmi(
                str(instance.height_ft),
                str(instance.height_in or 0),
                str(instance.weight_lbs),
            )

    def create(self, validated_data):
        record = super().create(validated_data)
        self._apply_bmi(record)
        derive_eligibility_flags(record)
        record.save()
        return record

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        self._apply_bmi(instance)
        derive_eligibility_flags(instance)
        instance.save()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id) if instance.user_id else None
        data["funnel_session_id"] = (
            str(instance.funnel_session_id) if instance.funnel_session_id else None
        )

        if instance.user_id:
            user = instance.user
            if user.dob:
                data["dob"] = user.dob.isoformat()
            if user.state:
                data["state"] = user.state
            try:
                profile = user.profile
            except PatientProfile.DoesNotExist:
                profile = None
            if profile and profile.sex_assigned_at_birth:
                data["sex_assigned_at_birth"] = profile.sex_assigned_at_birth
            if profile:
                gender = profile.gender_identity or profile.sex_assigned_at_birth
                if gender:
                    data["gender_identity"] = gender
        elif instance.dob:
            data["dob"] = instance.dob.isoformat()

        return data

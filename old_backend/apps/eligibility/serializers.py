from rest_framework import serializers

from apps.common.validation.eligibility import validate_eligibility_fields
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.services import derive_eligibility_flags
from apps.intakes.services import compute_bmi
from apps.patients.models import PatientProfile
from apps.questionnaires.models import Questionnaire
from apps.questionnaires.services import get_version_by_id, resolve_intake_questionnaire_slug
from apps.questionnaires.validation import validate_responses_against_version


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
            "selected_intake_questionnaire_slug",
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
                "Beema Health is currently only available for adults 18 and older."
            )

        field_errors = validate_eligibility_fields(attrs, self.instance)
        if field_errors:
            raise serializers.ValidationError(field_errors)

        responses = attrs.get("questionnaire_responses")
        version_id = attrs.get("questionnaire_version_id")
        if self.instance:
            if version_id is None:
                version_id = self.instance.questionnaire_version_id
            incoming_vid = attrs.get("questionnaire_version_id")
            if (
                incoming_vid
                and self.instance.questionnaire_version_id
                and str(incoming_vid) != str(self.instance.questionnaire_version_id)
            ):
                # The version is normally locked once answers exist so stored
                # responses stay consistent with the schema they were captured
                # under. But if the pinned version is no longer published (it was
                # superseded/archived), the session must follow the current live
                # flow: re-pin to the new version and drop the stale answers,
                # which belonged to a now-dead schema. Only block when the old
                # version is still live AND answers exist (a true mid-flow change).
                from apps.questionnaires.models import QuestionnaireVersion

                old_still_published = QuestionnaireVersion.objects.filter(
                    id=self.instance.questionnaire_version_id,
                    status=QuestionnaireVersion.Status.PUBLISHED,
                ).exists()
                if self.instance.questionnaire_responses and old_still_published:
                    raise serializers.ValidationError(
                        {"questionnaire_version_id": "Questionnaire version cannot be changed."}
                    )
                if self.instance.questionnaire_responses and not old_still_published:
                    # Clear stale answers so the new schema starts clean; only
                    # the answers included in this request (if any) are kept.
                    self.instance.questionnaire_responses = {}
        if responses is not None and version_id:
            # Funnel saves are incremental: validate the format of provided
            # answers but don't require unanswered downstream fields. Per-step
            # completeness is enforced on the client before advancing.
            q_errors = validate_responses_against_version(
                version_id, responses, enforce_required=False
            )
            if q_errors:
                raise serializers.ValidationError({"questionnaire_responses": q_errors})

        merged_responses = {
            **(
                (self.instance.questionnaire_responses or {})
                if self.instance
                else {}
            ),
            **(responses if responses is not None else {}),
        }
        if version_id:
            version = get_version_by_id(version_id)
            if (
                version
                and version.questionnaire.questionnaire_type
                == Questionnaire.QuestionnaireType.QUALIFY
            ):
                intake_slug = resolve_intake_questionnaire_slug(
                    version, merged_responses
                )
                if intake_slug:
                    attrs["selected_intake_questionnaire_slug"] = intake_slug

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

import re

from rest_framework import serializers

from apps.common.utils import normalize_phone

from .models import (
    Address,
    Allergy,
    ConsentRecord,
    DataRequest,
    IdentityDocument,
    MedicalCondition,
    PatientMedication,
    PatientProfile,
)

US_STATES = frozenset(
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD "
    "TN TX UT VT VA WA WV WI WY".split()
)
_ZIP = re.compile(r"^\d{5}(-\d{4})?$")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class CleanTextMixin:
    """Strip whitespace and reject control characters in every string field."""

    def to_internal_value(self, data):
        validated = super().to_internal_value(data)  # type: ignore[misc]
        for key, value in validated.items():
            if isinstance(value, str):
                if _CONTROL.search(value):
                    raise serializers.ValidationError({key: "Contains invalid characters."})
                validated[key] = value.strip()
        return validated


class PatientProfileSerializer(CleanTextMixin, serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = (
            "id", "date_of_birth", "sex_at_birth", "gender_identity", "height_inches", "starting_weight_lbs",
            "goal_weight_lbs", "preferred_pharmacy_note", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            "height_inches": {"min_value": 24, "max_value": 100},
            "starting_weight_lbs": {"min_value": 50, "max_value": 1500},
            "goal_weight_lbs": {"min_value": 50, "max_value": 1500},
            "preferred_pharmacy_note": {"max_length": 1000},
        }

    def validate_date_of_birth(self, value):
        from django.utils import timezone

        today = timezone.localdate()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if value > today or age > 120:
            raise serializers.ValidationError("Enter a valid date of birth.")
        return value


class AddressSerializer(CleanTextMixin, serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ("id", "kind", "line1", "line2", "city", "state", "zip_code", "is_default", "validated_at", "created_at")
        read_only_fields = ("id", "validated_at", "created_at")

    def validate_state(self, value: str) -> str:
        value = value.strip().upper()
        if value not in US_STATES:
            raise serializers.ValidationError("Enter a valid 2 letter US state.")
        return value

    def validate_zip_code(self, value: str) -> str:
        if not _ZIP.match(value.strip()):
            raise serializers.ValidationError("Enter a valid ZIP code.")
        return value.strip()


class AllergySerializer(CleanTextMixin, serializers.ModelSerializer):
    class Meta:
        model = Allergy
        fields = ("id", "name", "reaction", "severity", "created_at")
        read_only_fields = ("id", "created_at")
        extra_kwargs = {"reaction": {"max_length": 1000}}


class MedicationSerializer(CleanTextMixin, serializers.ModelSerializer):
    class Meta:
        model = PatientMedication
        fields = ("id", "name", "dose", "frequency", "is_current", "created_at")
        read_only_fields = ("id", "created_at")


class ConditionSerializer(CleanTextMixin, serializers.ModelSerializer):
    class Meta:
        model = MedicalCondition
        fields = ("id", "name", "notes", "diagnosed_on", "created_at")
        read_only_fields = ("id", "created_at")
        extra_kwargs = {"notes": {"max_length": 2000}}


class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentRecord
        fields = ("id", "kind", "version", "accepted_at")
        read_only_fields = ("id", "accepted_at")

    def validate_version(self, value: str) -> str:
        if not re.fullmatch(r"[\w.\-]{1,32}", value):
            raise serializers.ValidationError("Invalid version.")
        return value


class DataRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataRequest
        fields = ("id", "kind", "status", "completed_at", "created_at")
        read_only_fields = ("id", "status", "completed_at", "created_at")


class PresignSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=IdentityDocument.Kind.choices, default=IdentityDocument.Kind.DRIVERS_LICENSE)
    content_type = serializers.ChoiceField(choices=["image/jpeg", "image/png", "application/pdf"])

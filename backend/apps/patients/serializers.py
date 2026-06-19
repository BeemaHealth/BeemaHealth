from rest_framework import serializers

from apps.common.validation.form import is_valid_person_name, is_valid_phone
from apps.patients.models import PatientProfile, PatientSettings


class PatientProfileSerializer(serializers.ModelSerializer):
    zip = serializers.CharField(source="zip_code", required=False, allow_blank=True)

    class Meta:
        model = PatientProfile
        fields = [
            "id",
            "sex_assigned_at_birth",
            "gender_identity",
            "preferred_name",
            "address",
            "city",
            "county",
            "zip",
            "emergency_contact_name",
            "emergency_contact_phone",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
        extra_kwargs = {
            "sex_assigned_at_birth": {"required": False, "allow_blank": True},
            "gender_identity": {"required": False, "allow_blank": True},
            "preferred_name": {"required": False, "allow_blank": True},
            "address": {"required": False, "allow_blank": True},
            "city": {"required": False, "allow_blank": True},
            "county": {"required": False, "allow_blank": True},
            "emergency_contact_name": {"required": False, "allow_blank": True},
            "emergency_contact_phone": {"required": False, "allow_blank": True},
        }

    def validate_sex_assigned_at_birth(self, value):
        if value and value not in dict(PatientProfile.SEX_CHOICES):
            raise serializers.ValidationError("Invalid value.")
        return value

    def validate_gender_identity(self, value):
        if value and value not in dict(PatientProfile.SEX_CHOICES):
            raise serializers.ValidationError("Invalid value.")
        return value

    def validate_emergency_contact_name(self, value):
        if value and not is_valid_person_name(value):
            raise serializers.ValidationError("Enter a valid name.")
        return value.strip() if value else value

    def validate_emergency_contact_phone(self, value):
        if value and not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid 10-digit US phone number.")
        return value.strip() if value else value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()
        return data


class PatientSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientSettings
        fields = [
            "email_notifications",
            "sms_notifications",
            "product_emails",
            "two_factor_enabled",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()
        return data

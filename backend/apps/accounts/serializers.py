from rest_framework import serializers

from apps.common.utils import normalize_phone

from .models import User


class RequestLinkSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class VerifySerializer(serializers.Serializer):
    token = serializers.CharField(max_length=200, required=False, allow_blank=False)
    email = serializers.EmailField(max_length=254, required=False)
    code = serializers.RegexField(r"^\d{6}$", required=False)

    def validate(self, attrs):
        if attrs.get("token"):
            return attrs
        if attrs.get("email") and attrs.get("code"):
            return attrs
        raise serializers.ValidationError("Provide a token, or an email and code.")


class MeSerializer(serializers.ModelSerializer):
    email_verified = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    has_patient_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "phone", "kind", "timezone", "language",
            "email_verified", "roles", "has_patient_profile",
        )
        read_only_fields = ("id", "email", "kind")

    def get_email_verified(self, obj: User) -> bool:
        return obj.email_verified_at is not None

    def get_roles(self, obj: User) -> list[dict]:
        return [
            {"organization": g.organization.slug, "role": g.role}
            for g in obj.grants.filter(is_active=True).select_related("organization")
        ]

    def get_has_patient_profile(self, obj: User) -> bool:
        return hasattr(obj, "patient_profile")

    def validate_phone(self, value: str) -> str:
        if not value:
            return ""
        normalized = normalize_phone(value)
        if not normalized:
            raise serializers.ValidationError("Enter a valid phone number.")
        return normalized

    def validate_timezone(self, value: str) -> str:
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError, OSError):
            raise serializers.ValidationError("Unknown time zone.")
        return value

    def validate_first_name(self, value: str) -> str:
        return value.strip()

    def validate_last_name(self, value: str) -> str:
        return value.strip()

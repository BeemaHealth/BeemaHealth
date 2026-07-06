from django.contrib.auth import password_validation
from rest_framework import serializers

from apps.accounts.models import User
from apps.common.validation.form import is_valid_email, is_valid_person_name, is_valid_phone


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "dob",
            "state",
            "email_verified",
            "is_staff",
            "is_provider",
            "is_patient",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "email_verified",
            "is_staff",
            "is_provider",
            "is_patient",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=10)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "dob",
            "state",
        ]
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
            "phone": {"required": True, "allow_blank": False},
            "dob": {"required": False, "allow_null": True},
            "state": {"required": False, "allow_blank": True},
        }

    def validate_email(self, value: str) -> str:
        if not is_valid_email(value):
            raise serializers.ValidationError("Enter a valid email address.")
        return value.strip().lower()

    def validate_first_name(self, value: str) -> str:
        if not is_valid_person_name(value):
            raise serializers.ValidationError("Enter your legal first name.")
        return value.strip()

    def validate_last_name(self, value: str) -> str:
        if not is_valid_person_name(value):
            raise serializers.ValidationError("Enter your legal last name.")
        return value.strip()

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid 10-digit US phone number.")
        return value.strip()

    def validate_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data, is_patient=True, email_verified=False)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "dob", "state"]
        extra_kwargs = {
            "email": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
            "phone": {"required": False},
            "dob": {"required": False, "allow_null": True},
            "state": {"required": False},
        }

    def validate_email(self, value: str) -> str:
        if not is_valid_email(value):
            raise serializers.ValidationError("Enter a valid email address.")
        return value.strip().lower()

    def validate_first_name(self, value: str) -> str:
        if value and not is_valid_person_name(value):
            raise serializers.ValidationError("Enter your legal first name.")
        return value.strip() if value else value

    def validate_last_name(self, value: str) -> str:
        if value and not is_valid_person_name(value):
            raise serializers.ValidationError("Enter your legal last name.")
        return value.strip() if value else value

    def validate_phone(self, value: str) -> str:
        if value and not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid 10-digit US phone number.")
        return value.strip() if value else value

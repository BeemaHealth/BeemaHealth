from rest_framework import serializers

from apps.eligibility.models import EligibilityResponse
from apps.intakes.services import compute_bmi


class EligibilitySerializer(serializers.ModelSerializer):
    zip = serializers.CharField(source="zip_code", required=False)

    class Meta:
        model = EligibilityResponse
        fields = [
            "id",
            "user_id",
            "height_ft",
            "height_in",
            "weight",
            "bmi",
            "goal_weight",
            "biological_sex",
            "is_adult",
            "lives_in_colorado",
            "located_in_colorado",
            "city",
            "zip",
            "treatment_interest",
            "injection_preference",
            "budget",
            "safety_screen",
            "safety_concern_flag",
            "created_at",
        ]
        read_only_fields = ["id", "user_id", "bmi", "safety_concern_flag", "created_at"]

    def validate(self, attrs):
        is_adult = attrs.get("is_adult", getattr(self.instance, "is_adult", None))
        if is_adult is False:
            raise serializers.ValidationError(
                "Aretide is currently only available for adults 18 and older."
            )
        return attrs

    def create(self, validated_data):
        validated_data["bmi"] = compute_bmi(
            validated_data.get("height_ft", ""),
            validated_data.get("height_in", ""),
            validated_data.get("weight", ""),
        )
        safety = validated_data.get("safety_screen", {})
        validated_data["safety_concern_flag"] = any(safety.values())
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.bmi = compute_bmi(instance.height_ft, instance.height_in, instance.weight)
        instance.safety_concern_flag = any((instance.safety_screen or {}).values())
        instance.save()
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        return data

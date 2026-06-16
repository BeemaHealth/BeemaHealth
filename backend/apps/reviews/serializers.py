from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.consents.models import ConsentRecord
from apps.consents.serializers import ConsentRecordSerializer
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.serializers import EligibilitySerializer
from apps.intakes.models import MedicalIntake, SafetyFlag
from apps.intakes.serializers import MedicalIntakeSerializer
from apps.reviews.models import ProviderReview


class SafetyFlagSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = SafetyFlag
        fields = ["id", "user_id", "flag_type", "severity", "description", "created_at"]


class ProviderReviewSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    reviewer_id = serializers.UUIDField(source="reviewer.id", read_only=True, allow_null=True)

    class Meta:
        model = ProviderReview
        fields = [
            "id",
            "user_id",
            "reviewer_id",
            "status",
            "internal_note",
            "patient_note",
            "decision",
            "reviewed_at",
        ]
        read_only_fields = ["id", "user_id", "reviewer_id", "reviewed_at"]


class PatientListSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    age = serializers.IntegerField(allow_null=True)
    bmi = serializers.FloatField(allow_null=True)
    city = serializers.CharField(allow_blank=True)
    state = serializers.CharField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    treatment_interest = serializers.CharField(allow_blank=True)
    budget = serializers.CharField(allow_blank=True)
    flag_count = serializers.IntegerField()
    status = serializers.CharField()


class PatientDetailSerializer(serializers.Serializer):
    user = UserSerializer()
    eligibility = EligibilitySerializer(allow_null=True)
    intake = MedicalIntakeSerializer(allow_null=True)
    consent = ConsentRecordSerializer(allow_null=True)
    flags = SafetyFlagSerializer(many=True)
    review = ProviderReviewSerializer(allow_null=True)

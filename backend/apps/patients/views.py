from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.accounts.serializers import UserSerializer
from apps.consents.models import ConsentRecord
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake
from apps.patients.models import PatientProfile
from apps.reviews.models import ProviderReview


class PatientProfileSerializer(serializers.ModelSerializer):
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
            "zip_code",
            "emergency_contact_name",
            "emergency_contact_phone",
        ]
        read_only_fields = ["id"]


class DashboardView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        user = request.user
        intake = MedicalIntake.objects.filter(user=user).first()
        eligibility = EligibilityResponse.objects.filter(user=user).first()
        review = ProviderReview.objects.filter(user=user).first()
        status_value = "draft"
        if review:
            status_value = review.status
        elif intake:
            status_value = intake.status
        return Response(
            {
                "user": UserSerializer(user).data,
                "intake_status": status_value,
                "submitted_at": intake.submitted_at if intake else None,
                "treatment_interest": eligibility.treatment_interest if eligibility else None,
                "patient_note": review.patient_note if review else "",
            }
        )

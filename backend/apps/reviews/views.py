from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsProvider
from apps.audit.services import log_audit_event
from apps.consents.models import ConsentRecord
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake, SafetyFlag
from apps.intakes.services import compute_age, compute_bmi
from apps.prescriptions.serializers import PatientPrescriptionSerializer
from apps.prescriptions.services import get_active_prescription
from apps.reviews.models import ProviderReview
from apps.reviews.serializers import (
    PatientListSerializer,
    ProviderReviewSerializer,
)
from apps.eligibility.serializers import EligibilitySerializer
from apps.intakes.serializers import IntakeSubmissionSerializer, MedicalIntakeSerializer
from apps.intakes.submissions import get_active_submission
from apps.consents.serializers import ConsentRecordSerializer
from apps.reviews.serializers import SafetyFlagSerializer
from apps.accounts.serializers import UserSerializer


class PatientListView(APIView):
    permission_classes = [IsProvider]

    def get(self, request):
        users = User.objects.filter(is_patient=True, intake__status__in=["submitted", "under_review", "more_info_needed", "approved", "not_approved", "prescription_sent"]).distinct()
        results = []
        for user in users:
            eligibility = EligibilityResponse.objects.filter(user=user).first()
            intake = MedicalIntake.objects.filter(user=user).first()
            review = ProviderReview.objects.filter(user=user).first()
            flags = SafetyFlag.objects.filter(user=user).count()
            bmi = eligibility.bmi if eligibility else None
            if bmi is None and eligibility and eligibility.height_ft and eligibility.weight_lbs:
                bmi = compute_bmi(
                    str(eligibility.height_ft),
                    str(eligibility.height_in or 0),
                    str(eligibility.weight_lbs),
                )
            results.append(
                {
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "age": compute_age(user.dob),
                    "bmi": bmi,
                    "state": user.state,
                    "submitted_at": intake.submitted_at if intake else None,
                    "treatment_interest": eligibility.treatment_interest if eligibility else "",
                    "treatment_priority": eligibility.treatment_priority if eligibility else "",
                    "flag_count": flags,
                    "status": review.status if review else (intake.status if intake else "draft"),
                }
            )
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="patient_list",
            resource_id="all",
            request=request,
        )
        return Response(PatientListSerializer(results, many=True).data)


class PatientDetailView(APIView):
    permission_classes = [IsProvider]

    def get(self, request, patient_id):
        user = get_object_or_404(User, id=patient_id, is_patient=True)
        eligibility = EligibilityResponse.objects.filter(user=user).first()
        intake = MedicalIntake.objects.filter(user=user).first()
        consent = ConsentRecord.objects.filter(user=user).first()
        flags = SafetyFlag.objects.filter(user=user)
        review = ProviderReview.objects.filter(user=user).first()
        prescription = get_active_prescription(user)
        active_submission = get_active_submission(intake) if intake else None
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="patient",
            resource_id=str(user.id),
            request=request,
        )
        return Response(
            {
                "user": UserSerializer(user).data,
                "eligibility": EligibilitySerializer(eligibility).data if eligibility else None,
                "intake": MedicalIntakeSerializer(intake).data if intake else None,
                "submission": (
                    IntakeSubmissionSerializer(active_submission).data
                    if active_submission
                    else None
                ),
                "consent": ConsentRecordSerializer(consent).data if consent else None,
                "flags": SafetyFlagSerializer(flags, many=True).data,
                "review": ProviderReviewSerializer(review).data if review else None,
                "prescription": (
                    PatientPrescriptionSerializer(prescription).data
                    if prescription
                    else None
                ),
            }
        )

    def patch(self, request, patient_id):
        user = get_object_or_404(User, id=patient_id, is_patient=True)
        review, _ = ProviderReview.objects.get_or_create(user=user)
        serializer = ProviderReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(reviewer=request.user, reviewed_at=timezone.now())

        intake = MedicalIntake.objects.filter(user=user).first()
        if intake and review.status:
            intake.status = review.status
            intake.save(update_fields=["status", "updated_at"])

        log_audit_event(
            user=request.user,
            action="update",
            resource_type="provider_review",
            resource_id=str(review.id),
            request=request,
        )
        return Response(ProviderReviewSerializer(review).data)


class ProviderReviewSyncView(APIView):
    """Legacy sync endpoint used by the frontend client."""

    permission_classes = [IsProvider]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id required"}, status=status.HTTP_400_BAD_REQUEST)
        user = get_object_or_404(User, id=user_id, is_patient=True)
        review, _ = ProviderReview.objects.get_or_create(user=user)
        serializer = ProviderReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(reviewer=request.user, reviewed_at=timezone.now())
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="provider_review",
            resource_id=str(review.id),
            request=request,
        )
        return Response(ProviderReviewSerializer(review).data, status=status.HTTP_201_CREATED)

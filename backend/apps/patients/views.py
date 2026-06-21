from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.accounts.serializers import UserSerializer
from apps.audit.services import log_audit_event
from apps.consents.models import ConsentRecord
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake
from apps.patients.models import PatientProfile, PatientSettings
from apps.patients.serializers import PatientProfileSerializer, PatientSettingsSerializer
from apps.prescriptions.services import patient_has_active_prescription
from apps.reviews.models import ProviderReview


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
                "has_active_prescription": patient_has_active_prescription(user),
                "pharmacy_order": self._pharmacy_order_payload(user),
            }
        )

    def _pharmacy_order_payload(self, user):
        from apps.pharmacy.serializers import PharmacyOrderSerializer
        from apps.pharmacy.services import get_latest_pharmacy_order_for_user

        order = get_latest_pharmacy_order_for_user(user)
        if order is None:
            return None
        return PharmacyOrderSerializer(order).data


class PatientProfileMeView(APIView):
    permission_classes = [IsPatient]

    def get_object(self, user):
        profile, _ = PatientProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self.get_object(request.user)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="patient_profile",
            resource_id=str(profile.id),
            request=request,
        )
        return Response(PatientProfileSerializer(profile).data)

    def patch(self, request):
        profile = self.get_object(request.user)
        serializer = PatientProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()

        log_audit_event(
            user=request.user,
            action="update",
            resource_type="patient_profile",
            resource_id=str(profile.id),
            request=request,
        )
        return Response(PatientProfileSerializer(profile).data)


class PatientSettingsMeView(APIView):
    permission_classes = [IsPatient]

    def get_object(self, user):
        settings_obj, _ = PatientSettings.objects.get_or_create(user=user)
        return settings_obj

    def get(self, request):
        settings_obj = self.get_object(request.user)
        return Response(PatientSettingsSerializer(settings_obj).data)

    def patch(self, request):
        data = dict(request.data)
        if data.get("two_factor_enabled") is True:
            return Response(
                {"detail": "Use the two-factor confirm endpoint to enable 2FA."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        settings_obj = self.get_object(request.user)
        serializer = PatientSettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        settings_obj = serializer.save()
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="patient_settings",
            resource_id=str(settings_obj.id),
            request=request,
        )
        return Response(PatientSettingsSerializer(settings_obj).data)


class PatientTwoFactorSendCodeView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        from apps.accounts.services import (
            create_login_mfa_challenge,
            queue_login_mfa_email,
        )

        challenge, code = create_login_mfa_challenge(request.user)
        queue_login_mfa_email(request.user, code)
        return Response({"challenge_id": str(challenge.id)})


class PatientTwoFactorConfirmView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        from apps.accounts.serializers import TwoFactorConfirmSerializer
        from apps.accounts.services import verify_login_mfa_challenge

        serializer = TwoFactorConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            verify_login_mfa_challenge(
                str(serializer.validated_data["challenge_id"]),
                serializer.validated_data["code"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj, _ = PatientSettings.objects.get_or_create(user=request.user)
        settings_obj.two_factor_enabled = True
        settings_obj.save(update_fields=["two_factor_enabled", "updated_at"])
        return Response(PatientSettingsSerializer(settings_obj).data)

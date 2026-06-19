from django.conf import settings

ALLOWED_IF_PORTAL_FLAG = frozenset(
    {
        "submitted",
        "under_review",
        "more_info_needed",
        "approved",
        "not_approved",
        "prescription_sent",
    }
)


def patient_can_edit_intake(intake) -> bool:
    """Whether the patient may PATCH the working medical_intakes row."""
    if intake.status == "draft":
        return True
    if intake.status == "more_info_needed":
        return True
    if getattr(settings, "INTAKE_PORTAL_EDITING_ENABLED", False):
        return intake.status in ALLOWED_IF_PORTAL_FLAG
    return False


def patient_can_edit_intake_screening(intake) -> bool:
    """Whether qualify/account screening fields may change (user, eligibility, intake screening)."""
    if intake is None:
        return True
    return intake.status in ("draft", "more_info_needed")


def patient_has_active_prescription(user) -> bool:
    """Whether the patient has an active prescription (refills / side-effect check-ins)."""
    from apps.intakes.models import MedicalIntake
    from apps.reviews.models import ProviderReview

    review = ProviderReview.objects.filter(user=user).first()
    if review and review.status == "prescription_sent":
        return True
    intake = MedicalIntake.objects.filter(user=user).first()
    return intake is not None and intake.status == "prescription_sent"

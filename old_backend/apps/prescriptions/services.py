from apps.prescriptions.models import PatientPrescription


def get_active_prescription(user):
    return (
        PatientPrescription.objects.filter(user=user, is_active=True)
        .order_by("-prescribed_at", "-created_at")
        .first()
    )


def patient_has_active_prescription(user) -> bool:
    return PatientPrescription.objects.filter(user=user, is_active=True).exists()


def deactivate_prescriptions(user) -> None:
    PatientPrescription.objects.filter(user=user, is_active=True).update(is_active=False)

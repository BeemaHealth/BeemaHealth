from apps.patients.models import PatientProfile


def sync_patient_profile_from_intake(user, identity: dict | None) -> PatientProfile:
    """Persist intake-only identity fields on patient_profiles (single source of truth)."""
    identity = identity or {}
    profile, _ = PatientProfile.objects.get_or_create(user=user)

    if preferred := identity.get("preferred") or identity.get("preferred_name"):
        profile.preferred_name = preferred[:128]

    if address := identity.get("address"):
        profile.address = address[:255]

    if city := identity.get("city"):
        profile.city = city[:128]

    if zip_code := identity.get("zip"):
        profile.zip_code = zip_code[:16]

    if emergency_name := identity.get("emergency_name"):
        profile.emergency_contact_name = emergency_name[:255]

    if emergency_phone := identity.get("emergency_phone"):
        profile.emergency_contact_phone = emergency_phone[:32]

    profile.save()
    return profile

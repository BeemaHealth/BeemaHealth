from apps.patients.models import PatientProfile


def sync_patient_profile_from_intake(
    user,
    identity: dict | None,
    shipping: dict | None = None,
) -> PatientProfile:
    """Persist intake-only identity fields on patient_profiles (single source of truth).

    Dynamic ``address_group`` fields may flatten the patient's address into the
    ``medication_preferences`` shipping section instead of ``identity``. When the
    identity section has no address, fall back to those ``shipping_*`` values so
    the canonical profile address is still populated.
    """
    identity = identity or {}
    shipping = shipping or {}
    profile, _ = PatientProfile.objects.get_or_create(user=user)

    if preferred := identity.get("preferred") or identity.get("preferred_name"):
        profile.preferred_name = preferred[:128]

    if address := (identity.get("address") or shipping.get("shipping_address")):
        profile.address = address[:255]

    if city := (identity.get("city") or shipping.get("shipping_city")):
        profile.city = city[:128]

    if county := (identity.get("county") or shipping.get("shipping_county")):
        profile.county = county[:128]

    if zip_code := (identity.get("zip") or shipping.get("shipping_zip")):
        profile.zip_code = zip_code[:16]

    if emergency_name := identity.get("emergency_name"):
        profile.emergency_contact_name = emergency_name[:255]

    if emergency_phone := identity.get("emergency_phone"):
        profile.emergency_contact_phone = emergency_phone[:32]

    profile.save()
    return profile

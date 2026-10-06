from django.db import migrations


def _identity_contact_from_intake(intake, profile):
    identity = intake.identity or {}
    return {
        "preferred": (
            identity.get("preferred")
            or identity.get("preferred_name")
            or (getattr(profile, "preferred_name", "") if profile else "")
            or ""
        ),
        "address": identity.get("address") or (getattr(profile, "address", "") if profile else "") or "",
        "city": identity.get("city") or (getattr(profile, "city", "") if profile else "") or "",
        "county": identity.get("county") or (getattr(profile, "county", "") if profile else "") or "",
        "zip": identity.get("zip") or (getattr(profile, "zip_code", "") if profile else "") or "",
        "emergency_name": (
            identity.get("emergency_name")
            or (getattr(profile, "emergency_contact_name", "") if profile else "")
            or ""
        ),
        "emergency_phone": (
            identity.get("emergency_phone")
            or (getattr(profile, "emergency_contact_phone", "") if profile else "")
            or ""
        ),
        "address_verified": identity.get("address_verified", ""),
    }


def backfill_identity_contact(apps, schema_editor):
    MedicalIntake = apps.get_model("intakes", "MedicalIntake")
    IntakeSubmission = apps.get_model("intakes", "IntakeSubmission")
    PatientProfile = apps.get_model("patients", "PatientProfile")

    for intake in MedicalIntake.objects.select_related("user").iterator():
        profile = PatientProfile.objects.filter(user=intake.user_id).first()
        contact = _identity_contact_from_intake(intake, profile)
        for submission in IntakeSubmission.objects.filter(medical_intake=intake):
            snapshot = dict(submission.snapshot or {})
            existing = snapshot.get("identity_contact") or {}
            if not any(
                existing.get(key)
                for key in (
                    "preferred",
                    "address",
                    "city",
                    "county",
                    "zip",
                    "emergency_name",
                    "emergency_phone",
                )
            ):
                snapshot["identity_contact"] = contact
                submission.snapshot = snapshot
                submission.save(update_fields=["snapshot"])


class Migration(migrations.Migration):

    dependencies = [
        ("intakes", "0005_medicalintake_account_screening"),
        ("patients", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(backfill_identity_contact, migrations.RunPython.noop),
    ]

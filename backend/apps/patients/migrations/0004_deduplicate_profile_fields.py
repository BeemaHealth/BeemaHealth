from django.db import migrations, models


def migrate_profile_state_to_user(apps, schema_editor):
    PatientProfile = apps.get_model("patients", "PatientProfile")
    for profile in PatientProfile.objects.select_related("user").iterator():
        user = profile.user
        if profile.state and not user.state:
            user.state = profile.state
            user.save(update_fields=["state", "updated_at"])


def dedupe_existing_intakes(apps, schema_editor):
    MedicalIntake = apps.get_model("intakes", "MedicalIntake")
    EligibilityResponse = apps.get_model("eligibility", "EligibilityResponse")

    identity_strip = {
        "legal_first",
        "legal_last",
        "first_name",
        "last_name",
        "email",
        "phone",
        "dob",
        "state",
    }
    body_strip = {"current_weight", "height_ft", "height_in", "goal_weight", "height", "weight"}
    pregnancy_strip = {"pregnant", "trying", "breastfeeding"}
    condition_strip = {
        "thyroid_cancer",
        "men2",
        "pancreatitis",
        "gallbladder",
        "kidney",
        "kidney_severe",
        "liver",
        "gastroparesis",
        "diabetic_retinopathy",
    }

    for intake in MedicalIntake.objects.select_related("user").iterator():
        changed = False
        identity = dict(intake.identity or {})
        for key in identity_strip:
            if key in identity:
                identity.pop(key)
                changed = True
        if identity != intake.identity:
            intake.identity = identity
            changed = True

        body = dict(intake.body_metrics or {})
        for key in body_strip:
            if key in body:
                body.pop(key)
                changed = True
        if body != intake.body_metrics:
            intake.body_metrics = body
            changed = True

        pregnancy = dict(intake.pregnancy or {})
        for key in pregnancy_strip:
            if key in pregnancy:
                pregnancy.pop(key)
                changed = True
        if pregnancy != intake.pregnancy:
            intake.pregnancy = pregnancy
            changed = True

        conditions = dict(intake.medical_conditions or {})
        for key in list(conditions.keys()):
            if key in condition_strip or key.endswith("_note") and key[:-5] in condition_strip:
                conditions.pop(key)
                changed = True
        if conditions != intake.medical_conditions:
            intake.medical_conditions = conditions
            changed = True

        allergies = dict(intake.allergies or {})
        answers = dict(allergies.get("answers") or {})
        if "glp1" in answers:
            answers.pop("glp1")
            allergies["answers"] = answers
            intake.allergies = allergies
            changed = True

        eligibility = EligibilityResponse.objects.filter(user=intake.user).first()
        prefs = dict(intake.medication_preferences or {})
        if eligibility and eligibility.treatment_interest and "treatment" in prefs:
            prefs.pop("treatment")
            intake.medication_preferences = prefs
            changed = True

        if changed:
            intake.save()

    for eligibility in EligibilityResponse.objects.filter(user_id__isnull=False).select_related("user"):
        user = eligibility.user
        PatientProfile = apps.get_model("patients", "PatientProfile")
        profile, _ = PatientProfile.objects.get_or_create(user=user)
        if eligibility.dob and not user.dob:
            user.dob = eligibility.dob
            user.save(update_fields=["dob", "updated_at"])
        if eligibility.state and not user.state:
            user.state = eligibility.state
            user.save(update_fields=["state", "updated_at"])
        if eligibility.sex_assigned_at_birth and not profile.sex_assigned_at_birth:
            profile.sex_assigned_at_birth = eligibility.sex_assigned_at_birth
            profile.save(update_fields=["sex_assigned_at_birth", "updated_at"])
        updates = []
        if eligibility.dob is not None:
            eligibility.dob = None
            updates.append("dob")
        if eligibility.state:
            eligibility.state = ""
            updates.append("state")
        if eligibility.sex_assigned_at_birth:
            eligibility.sex_assigned_at_birth = ""
            updates.append("sex_assigned_at_birth")
        if updates:
            eligibility.save(update_fields=updates + ["updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0003_patientprofile_sex"),
        ("intakes", "0001_initial"),
        ("eligibility", "0002_funnel_session_schema_v2"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprofile",
            name="preferred_name",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.RunPython(migrate_profile_state_to_user, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="patientprofile",
            name="state",
        ),
        migrations.RunPython(dedupe_existing_intakes, migrations.RunPython.noop),
    ]

from django.db import migrations, models


def backfill_account_screening(apps, schema_editor):
    MedicalIntake = apps.get_model("intakes", "MedicalIntake")
    EligibilityResponse = apps.get_model("eligibility", "EligibilityResponse")
    IntakeSubmission = apps.get_model("intakes", "IntakeSubmission")

    for intake in MedicalIntake.objects.select_related("user").iterator():
        user = intake.user
        eligibility = EligibilityResponse.objects.filter(user=user).first()
        bmi = None
        if eligibility and eligibility.bmi is not None:
            bmi = float(eligibility.bmi)
        screening = {
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "email": user.email or "",
            "phone": user.phone or "",
            "dob": user.dob.isoformat() if user.dob else "",
            "state": user.state or "",
            "height_ft": eligibility.height_ft if eligibility else None,
            "height_in": eligibility.height_in if eligibility else None,
            "weight_lbs": (
                str(eligibility.weight_lbs)
                if eligibility and eligibility.weight_lbs is not None
                else None
            ),
            "goal_weight_lbs": (
                str(eligibility.goal_weight_lbs)
                if eligibility and eligibility.goal_weight_lbs is not None
                else None
            ),
            "bmi": bmi,
        }
        intake.account_screening = screening
        intake.save(update_fields=["account_screening"])

        first = screening["first_name"]
        last = screening["last_name"]
        account_summary = {
            **screening,
            "full_name": f"{first} {last}".strip(),
        }
        for submission in IntakeSubmission.objects.filter(medical_intake=intake):
            snapshot = dict(submission.snapshot or {})
            if not snapshot.get("account_summary"):
                snapshot["account_summary"] = account_summary
            if not snapshot.get("account"):
                snapshot["account"] = {
                    "first_name": screening["first_name"],
                    "last_name": screening["last_name"],
                    "email": screening["email"],
                    "phone": screening["phone"],
                    "dob": screening["dob"],
                    "state": screening["state"],
                }
            if not snapshot.get("eligibility_screening") and eligibility:
                snapshot["eligibility_screening"] = {
                    "height_ft": screening["height_ft"],
                    "height_in": screening["height_in"],
                    "weight_lbs": screening["weight_lbs"],
                    "goal_weight_lbs": screening["goal_weight_lbs"],
                    "bmi": screening["bmi"],
                }
            submission.snapshot = snapshot
            submission.save(update_fields=["snapshot"])


class Migration(migrations.Migration):

    dependencies = [
        ("intakes", "0004_intakesubmission"),
        ("eligibility", "0001_initial"),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="medicalintake",
            name="account_screening",
            field=models.JSONField(default=dict),
        ),
        migrations.RunPython(backfill_account_screening, migrations.RunPython.noop),
    ]

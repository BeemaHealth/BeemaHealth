# Generated manually for funnel sessions and eligibility schema v2

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import fernet_fields.fields


class Migration(migrations.Migration):

    dependencies = [
        ("eligibility", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FunnelSession",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("token_hash", models.CharField(max_length=64, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("claimed", "Claimed"),
                            ("expired", "Expired"),
                            ("abandoned", "Abandoned"),
                        ],
                        default="active",
                        max_length=16,
                    ),
                ),
                ("claimed_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField()),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "claimed_by_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="claimed_funnel_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "funnel_sessions",
            },
        ),
        migrations.RemoveField(model_name="eligibilityresponse", name="biological_sex"),
        migrations.RemoveField(model_name="eligibilityresponse", name="budget"),
        migrations.RemoveField(model_name="eligibilityresponse", name="city"),
        migrations.RemoveField(model_name="eligibilityresponse", name="goal_weight"),
        migrations.RemoveField(model_name="eligibilityresponse", name="injection_preference"),
        migrations.RemoveField(model_name="eligibilityresponse", name="is_adult"),
        migrations.RemoveField(model_name="eligibilityresponse", name="located_in_colorado"),
        migrations.RemoveField(model_name="eligibilityresponse", name="lives_in_colorado"),
        migrations.RemoveField(model_name="eligibilityresponse", name="weight"),
        migrations.RemoveField(model_name="eligibilityresponse", name="zip_code"),
        migrations.AlterField(
            model_name="eligibilityresponse",
            name="height_ft",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="eligibilityresponse",
            name="height_in",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="eligibilityresponse",
            name="user",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="eligibility",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="eligibilityresponse",
            name="bmi",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name="eligibilityresponse",
            name="treatment_interest",
            field=models.CharField(
                blank=True,
                choices=[
                    ("glp1_pills", "GLP-1 pills"),
                    ("glp1_injections", "GLP-1 injections"),
                    ("provider_recommendation", "Provider recommendation"),
                    ("not_sure", "Not sure"),
                ],
                default="",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="disqualification_reason",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="dob",
            field=fernet_fields.fields.EncryptedDateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="funnel_session",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="eligibility",
                to="eligibility.funnelsession",
            ),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="goal_weight_lbs",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="is_18_or_older",
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="is_likely_eligible",
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="needs_clinician_review",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="pre_signup_consents",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="primary_goal",
            field=models.CharField(
                blank=True,
                choices=[
                    ("improve_health", "Improve my health"),
                    ("gain_confidence", "Gain confidence"),
                    ("feel_better_clothes", "Feel better in my clothes"),
                    ("lose_weight", "Lose weight"),
                    ("metabolic_health", "Metabolic health"),
                    ("learn_options", "Learn my options"),
                    ("something_else", "Something else"),
                ],
                default="",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="sex_assigned_at_birth",
            field=models.CharField(
                blank=True,
                choices=[
                    ("female", "Female"),
                    ("male", "Male"),
                    ("intersex", "Intersex"),
                    ("unknown", "Unknown"),
                ],
                default="",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="state",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="target_weight_loss_range",
            field=models.CharField(
                blank=True,
                choices=[
                    ("1_15", "Lose 1–15 pounds"),
                    ("16_50", "Lose 16–50 pounds"),
                    ("51_100", "Lose 51–100 pounds"),
                    ("100_plus", "Lose 100+ pounds"),
                    ("not_sure", "Not sure — I just need to lose weight"),
                ],
                default="",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="treatment_priority",
            field=models.CharField(
                blank=True,
                choices=[
                    ("fda_approved", "FDA-approved medications"),
                    ("cost", "Affordability"),
                    ("results", "Results that last"),
                    ("convenience", "Convenience"),
                    ("provider_support", "Support from licensed providers"),
                ],
                default="",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="weight_lbs",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=6, null=True),
        ),
    ]

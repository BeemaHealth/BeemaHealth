from django.core.management.base import BaseCommand

from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)

QUALIFY_STEPS = [
    {
        "step_key": "treatment_interest",
        "title": "Which delivery format interests you most?",
        "subtitle": "Your answer helps us align you with an appropriate care pathway.",
        "fields": [
            {
                "field_key": "treatment_interest",
                "field_type": "single_choice",
                "label": "Treatment interest",
                "options": [
                    {"value": "glp1_pills", "label": "Oral GLP-1 tablets"},
                    {"value": "glp1_injections", "label": "Injectable GLP-1 therapy"},
                    {
                        "value": "provider_recommendation",
                        "label": "I'd like my clinician to recommend the best option",
                    },
                ],
                "required": True,
            }
        ],
    },
    {
        "step_key": "primary_goal",
        "title": "What's motivating you to explore weight care?",
        "subtitle": "Everyone's journey is different — choose what fits you best.",
        "fields": [
            {
                "field_key": "primary_goal",
                "field_type": "single_choice",
                "label": "Primary goal",
                "options": [
                    {"value": "improve_health", "label": "Support my long-term health"},
                    {"value": "gain_confidence", "label": "Feel more confident day to day"},
                    {"value": "feel_better_clothes", "label": "Move and feel better in my body"},
                    {"value": "something_else", "label": "Something else motivates me"},
                ],
                "required": True,
            }
        ],
    },
    {
        "step_key": "account",
        "title": "Create your account",
        "subtitle": "",
        "fields": [
            {
                "field_key": "account",
                "field_type": "account",
                "label": "Create your account",
                "maps_to_section": "",
                "required": True,
                "options": [
                    {"value": "first_name", "label": "Legal first name", "backend": "register.first_name", "beluga": "beluga:firstName"},
                    {"value": "last_name", "label": "Legal last name", "backend": "register.last_name", "beluga": "beluga:lastName"},
                    {"value": "phone", "label": "Phone", "backend": "register.phone", "beluga": "beluga:phone"},
                    {"value": "email", "label": "Email", "backend": "register.email", "beluga": "beluga:email"},
                    {"value": "password", "label": "Password", "backend": "register.password", "beluga": ""},
                    {"value": "confirm_password", "label": "Re-enter password", "backend": "", "beluga": ""},
                ],
            }
        ],
    },
]

INTAKE_STEPS = [
    {
        "step_key": "identity_contact",
        "title": "Identity & contact",
        "subtitle": "We'll use this to coordinate your care and shipping.",
        "fields": [
            {"field_key": "address", "field_type": "text", "label": "Street address", "maps_to_section": "identity", "required": True},
            {"field_key": "city", "field_type": "text", "label": "City", "maps_to_section": "identity", "required": True},
            {"field_key": "zip", "field_type": "text", "label": "ZIP code", "maps_to_section": "identity", "required": True},
            {"field_key": "phone", "field_type": "phone", "label": "Phone", "maps_to_section": "identity", "required": True},
        ],
    },
    {
        "step_key": "review_agree",
        "title": "Review & agree",
        "subtitle": "Confirm your answers before submission.",
        "fields": [
            {
                "field_key": "intake_review",
                "field_type": "plugin",
                "label": "Review",
                "plugin_id": "intake_review",
                "required": True,
            }
        ],
    },
]


class Command(BaseCommand):
    help = "Seed baseline qualify and intake questionnaire versions."

    def handle(self, *args, **options):
        for slug, title, qtype, steps_data in [
            ("qualify", "Qualify funnel", "qualify", QUALIFY_STEPS),
            ("intake", "Medical intake", "intake", INTAKE_STEPS),
        ]:
            questionnaire, _ = Questionnaire.objects.get_or_create(
                slug=slug,
                defaults={"title": title, "questionnaire_type": qtype},
            )
            if questionnaire.questionnaire_type != qtype:
                questionnaire.questionnaire_type = qtype
                questionnaire.save(update_fields=["questionnaire_type"])
            if questionnaire.versions.filter(status=QuestionnaireVersion.Status.PUBLISHED).exists():
                self.stdout.write(f"Skipping {slug} — published version exists.")
                continue
            version = QuestionnaireVersion.objects.create(
                questionnaire=questionnaire,
                version_label="1.0.0",
                status=QuestionnaireVersion.Status.PUBLISHED,
                # Baseline qualify is the default entry and routes everyone to
                # the baseline intake.
                is_default_entry=(qtype == "qualify"),
                intake_routing_rules=(
                    [
                        {
                            "when_field": "__default__",
                            "when_value": "",
                            "intake_questionnaire_slug": "intake",
                        }
                    ]
                    if qtype == "qualify"
                    else []
                ),
            )
            version.published_at = version.created_at
            version.save(update_fields=["published_at"])
            for order, step_data in enumerate(steps_data):
                step = QuestionnaireStep.objects.create(
                    version=version,
                    step_key=step_data["step_key"],
                    sort_order=order,
                    title=step_data["title"],
                    subtitle=step_data.get("subtitle", ""),
                    visibility_rule=step_data.get("visibility_rule"),
                )
                for field_order, field_data in enumerate(step_data.get("fields", [])):
                    QuestionnaireField.objects.create(
                        step=step,
                        sort_order=field_order,
                        field_key=field_data["field_key"],
                        field_type=field_data["field_type"],
                        label=field_data["label"],
                        help_text=field_data.get("help_text", ""),
                        options=field_data.get("options", []),
                        validation_rules=field_data.get("validation_rules", []),
                        maps_to_section=field_data.get("maps_to_section", ""),
                        plugin_id=field_data.get("plugin_id", ""),
                        required=field_data.get("required", False),
                    )
            self.stdout.write(self.style.SUCCESS(f"Seeded {slug} v1.0.0 with {len(steps_data)} steps."))

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


def make_patient_with_payment_field(payment_mode="auth_hold", email="patient@example.com"):
    """A patient with an intake pinned to a version that has a payment field.

    Intake versions never require an adjacent account field (see
    validate_payment_field_placement) so this is the simplest fixture that
    makes resolve_payment_config() succeed.
    """
    user = User.objects.create_user(
        email=email,
        password="secure-pass-1",
        first_name="Jane",
        last_name="Doe",
        phone="3035550100",
    )
    questionnaire = Questionnaire.objects.create(
        slug=f"intake-{user.id}",
        title="Intake",
        questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
    )
    version = QuestionnaireVersion.objects.create(
        questionnaire=questionnaire,
        version_label="1.0.0",
    )
    step = QuestionnaireStep.objects.create(
        version=version, step_key="pay", sort_order=0, title="Payment"
    )
    QuestionnaireField.objects.create(
        step=step,
        field_key="payment",
        field_type=QuestionnaireField.FieldType.PLUGIN,
        plugin_id="stripe_payment_hold",
        label="Payment",
        sort_order=0,
        options={"payment_mode": payment_mode},
    )
    intake = MedicalIntake.objects.create(
        user=user, questionnaire_version_id=version.id
    )
    return user, intake, version

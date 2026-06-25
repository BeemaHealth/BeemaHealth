import re
import uuid

from django.db import models

from apps.accounts.models import User

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


class Medication(models.Model):
    class DeliveryType(models.TextChoices):
        INJECTION = "injection", "Injection"
        DAILY_PILL = "daily_pill", "Daily pill"

    class DrugType(models.TextChoices):
        SEMAGLUTIDE = "semaglutide", "Semaglutide"
        TIRZEPATIDE = "tirzepatide", "Tirzepatide"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    slug = models.SlugField(max_length=64, unique=True)
    drug_type = models.CharField(max_length=32, choices=DrugType.choices)
    delivery_type = models.CharField(max_length=16, choices=DeliveryType.choices)
    price_cents = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medications"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Questionnaire(models.Model):
    class QuestionnaireType(models.TextChoices):
        QUALIFY = "qualify", "Qualify"
        INTAKE = "intake", "Intake"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.CharField(max_length=64, unique=True)
    questionnaire_type = models.CharField(
        max_length=16,
        choices=QuestionnaireType.choices,
        default=QuestionnaireType.QUALIFY,
    )
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questionnaires",
    )
    title = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "questionnaires"

    def __str__(self):
        return self.title


class QuestionnaireVersion(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    questionnaire = models.ForeignKey(
        Questionnaire,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_label = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questionnaire_versions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "questionnaire_versions"
        constraints = [
            models.UniqueConstraint(
                fields=["questionnaire", "version_label"],
                name="unique_questionnaire_version_label",
            )
        ]

    def __str__(self):
        return f"{self.questionnaire.slug} {self.version_label} ({self.status})"


class QuestionnaireStep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(
        QuestionnaireVersion,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    step_key = models.CharField(max_length=64)
    sort_order = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=256)
    subtitle = models.TextField(blank=True, default="")
    visibility_rule = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "questionnaire_steps"
        ordering = ["sort_order", "step_key"]
        constraints = [
            models.UniqueConstraint(
                fields=["version", "step_key"],
                name="unique_step_key_per_version",
            )
        ]

    def __str__(self):
        return f"{self.step_key} (order {self.sort_order})"


class QuestionnaireField(models.Model):
    class FieldType(models.TextChoices):
        SINGLE_CHOICE = "single_choice", "Single choice"
        MULTI_CHOICE = "multi_choice", "Multi choice"
        YES_NO = "yes_no", "Yes / No"
        TEXT = "text", "Text"
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        PASSWORD = "password", "Password"
        DATE = "date", "Date"
        NUMBER = "number", "Number"
        TEXTAREA = "textarea", "Textarea"
        ADDRESS_GROUP = "address_group", "Address group"
        PLUGIN = "plugin", "Plugin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    step = models.ForeignKey(
        QuestionnaireStep,
        on_delete=models.CASCADE,
        related_name="fields",
    )
    field_key = models.CharField(max_length=64)
    field_type = models.CharField(max_length=32, choices=FieldType.choices)
    label = models.CharField(max_length=256)
    help_text = models.TextField(blank=True, default="")
    options = models.JSONField(default=list, blank=True)
    validation_rules = models.JSONField(default=list, blank=True)
    maps_to_section = models.CharField(max_length=64, blank=True, default="")
    plugin_id = models.CharField(max_length=64, blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)
    required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "questionnaire_fields"
        ordering = ["sort_order", "field_key"]
        constraints = [
            models.UniqueConstraint(
                fields=["step", "field_key"],
                name="unique_field_key_per_step",
            )
        ]

    def __str__(self):
        return f"{self.field_key} ({self.field_type})"


class Experiment(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        RUNNING = "running", "Running"
        STOPPED = "stopped", "Stopped"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    questionnaire = models.ForeignKey(
        Questionnaire,
        on_delete=models.CASCADE,
        related_name="experiments",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="experiments_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "experiments"

    def __str__(self):
        return self.name


class ExperimentVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    variant_key = models.CharField(max_length=32)
    questionnaire_version = models.ForeignKey(
        QuestionnaireVersion,
        on_delete=models.CASCADE,
        related_name="experiment_variants",
    )
    weight_percent = models.PositiveSmallIntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "experiment_variants"
        constraints = [
            models.UniqueConstraint(
                fields=["experiment", "variant_key"],
                name="unique_variant_key_per_experiment",
            )
        ]

    def __str__(self):
        return f"{self.experiment.name} / {self.variant_key}"

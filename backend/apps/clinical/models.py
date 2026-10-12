"""Clinical models: treatments, visits, prescriptions, dose logs and health records."""
from __future__ import annotations

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.crypto import EncryptedTextField
from apps.common.models import BaseModel


class Treatment(BaseModel):
    """One patient's course of a product. Status follows the state machine in services."""

    class Status(models.TextChoices):
        QUESTIONNAIRE_IN_PROGRESS = "questionnaire_in_progress", "Questionnaire in progress"
        NOT_ELIGIBLE = "not_eligible", "Not eligible"
        AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
        AWAITING_VISIT_COMPLETION = "awaiting_visit_completion", "Awaiting visit completion"
        ROUTING_REVIEW = "routing_review", "Routing review"
        PENDING_VISIT = "pending_visit", "Pending visit"
        NEEDS_PATIENT_ACTION = "needs_patient_action", "Needs patient action"
        CANCELED = "canceled", "Canceled"
        PRESCRIBED = "prescribed", "Prescribed"
        REFERRED = "referred", "Referred"
        ACTIVE = "active", "Active"
        REFILL_DUE = "refill_due", "Refill due"
        PAUSED = "paused", "Paused"
        ENDED = "ended", "Ended"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="treatments")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="treatments")
    plan = models.ForeignKey("catalog.Plan", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatments")
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatments"
    )
    submission = models.ForeignKey(
        "questionnaires.Submission", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatments"
    )
    status = models.CharField(
        max_length=40, choices=Status.choices, default=Status.QUESTIONNAIRE_IN_PROGRESS, db_index=True
    )
    requested_dose_label = models.CharField(max_length=100, blank=True)
    requested_strength_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    prescribed_strength_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    dose_changed_by_doctor = models.BooleanField(default=False)
    titration_level = models.PositiveSmallIntegerField(default=0)
    submitted_to_network_at = models.DateTimeField(null=True, blank=True)
    network = models.ForeignKey(
        "accounts.Organization", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    pharmacy = models.ForeignKey(
        "accounts.Organization", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.CharField(max_length=100, blank=True)

    class Meta(BaseModel.Meta):
        indexes = [models.Index(fields=["patient", "status"])]

    def __str__(self) -> str:
        return f"Treatment {self.id} ({self.status})"


class Visit(BaseModel):
    """A doctor network visit. ``external_id`` is the Beluga masterId and is not unique."""

    class Kind(models.TextChoices):
        INITIAL = "initial", "Initial"
        TITRATION = "titration", "Titration"
        REFILL = "refill", "Refill"
        RENEWAL = "renewal", "Renewal"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SCHEDULED = "scheduled", "Scheduled"
        CONCLUDED = "concluded", "Concluded"
        CANCELED = "canceled", "Canceled"
        NO_SHOW = "no_show", "No show"

    class Outcome(models.TextChoices):
        PRESCRIBED = "prescribed", "Prescribed"
        REFERRED = "referred", "Referred"
        CANCELED = "canceled", "Canceled"
        NONE = "none", "None"

    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name="visits")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.INITIAL)
    external_id = models.CharField(max_length=100, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    video_location = models.CharField(max_length=500, blank=True)
    outcome = models.CharField(max_length=20, choices=Outcome.choices, default=Outcome.NONE)
    submitted_at = models.DateTimeField(null=True, blank=True)
    concluded_at = models.DateTimeField(null=True, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)

    def __str__(self) -> str:
        return f"Visit {self.id} ({self.kind}, {self.status})"


class Prescription(BaseModel):
    """A prescription written by the network. Prescriber NPI is unconfirmed, so nullable."""

    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name="prescriptions")
    visit = models.ForeignKey(Visit, on_delete=models.SET_NULL, null=True, blank=True, related_name="prescriptions")
    external_rx_id = models.CharField(max_length=100, blank=True, db_index=True)
    external_med_id = models.CharField(max_length=100, blank=True)
    drug = models.CharField(max_length=100, blank=True)
    strength = models.CharField(max_length=100, blank=True)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    refills = models.PositiveIntegerField(default=0)
    prescriber_name = models.CharField(max_length=200, blank=True)
    prescriber_npi = models.CharField(max_length=10, blank=True, null=True)
    pharmacy_notes = models.TextField(blank=True)
    written_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Prescription {self.id}"


class ActionItem(BaseModel):
    """Something the patient must do. Drives the portal required-action banner. Content free."""

    class Kind(models.TextChoices):
        COMPLETE_VISIT = "complete_visit", "Complete visit"
        PAYMENT_FAILED = "payment_failed", "Payment failed"
        UPLOAD_ID = "upload_id", "Upload ID"
        UPLOAD_PROOF = "upload_proof", "Upload proof"
        BOOK_VISIT = "book_visit", "Book visit"
        ANSWER_FOLLOWUP = "answer_followup", "Answer follow-up"
        CONFIRM_ADDRESS = "confirm_address", "Confirm address"

    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, null=True, blank=True, related_name="action_items")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="action_items")
    kind = models.CharField(max_length=30, choices=Kind.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    opened_by_state = models.CharField(max_length=40, blank=True, help_text="Treatment state that opened this item.")
    is_open = models.BooleanField(default=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        indexes = [models.Index(fields=["patient", "is_open"])]

    def __str__(self) -> str:
        return f"ActionItem {self.id} ({self.kind})"


class DrugIneligibility(BaseModel):
    """A patient who was not prescribed a drug is ineligible for it until staff lift the block."""

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="drug_ineligibilities")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="+")
    drug = models.CharField(max_length=100, blank=True)
    reason = models.CharField(max_length=100)
    source_treatment = models.ForeignKey(Treatment, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    lifted_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    lifted_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name_plural = "drug ineligibilities"

    def __str__(self) -> str:
        return f"DrugIneligibility {self.id}"

    @property
    def is_active(self) -> bool:
        """True until staff lift the block."""
        return self.lifted_at is None


class DoseLog(BaseModel):
    """One scheduled or taken dose. Patient entered data is self reported, not clinical truth."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        TAKEN = "taken", "Taken"
        SKIPPED = "skipped", "Skipped"

    class EnteredBy(models.TextChoices):
        PATIENT = "patient", "Patient"
        STAFF = "staff", "Staff"

    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name="dose_logs")
    scheduled_at = models.DateTimeField(db_index=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    strength_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    dose_number = models.PositiveIntegerField(null=True, blank=True)
    injection_site = models.CharField(max_length=50, blank=True)
    pain_0_5 = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    notes = EncryptedTextField(blank=True, default="")
    entered_by = models.CharField(max_length=10, choices=EnteredBy.choices, default=EnteredBy.PATIENT)
    auto_generated = models.BooleanField(default=False, help_text="Created by the dose schedule generator.")

    class Meta(BaseModel.Meta):
        ordering = ["scheduled_at"]

    def __str__(self) -> str:
        return f"DoseLog {self.id} ({self.status})"


class HealthMetric(BaseModel):
    """Patient recorded weight, calories, exercise or side effect severity."""

    class Kind(models.TextChoices):
        WEIGHT = "weight", "Weight"
        CALORIES = "calories", "Calories"
        EXERCISE = "exercise", "Exercise"
        SIDE_EFFECT = "side_effect", "Side effect"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="health_metrics")
    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    on_date = models.DateField(db_index=True)
    value = models.DecimalField(max_digits=8, decimal_places=2)
    unit = models.CharField(max_length=20, blank=True)
    notes = EncryptedTextField(blank=True, default="")

    class Meta(BaseModel.Meta):
        ordering = ["-on_date", "-created_at"]

    def __str__(self) -> str:
        return f"HealthMetric {self.id} ({self.kind})"

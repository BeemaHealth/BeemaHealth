from rest_framework import serializers

from apps.common.validation.prescription import (
    validate_dosage,
    validate_frequency,
    validate_medication_name,
    validate_optional_prescription_text,
)
from apps.prescriptions.models import PatientPrescription


class PatientPrescriptionSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    prescribed_by_id = serializers.UUIDField(
        source="prescribed_by.id", read_only=True, allow_null=True
    )
    provider_review_id = serializers.UUIDField(
        source="provider_review.id", read_only=True, allow_null=True
    )

    class Meta:
        model = PatientPrescription
        fields = [
            "id",
            "user_id",
            "provider_review_id",
            "medication_name",
            "dosage",
            "frequency",
            "route",
            "instructions",
            "pharmacy_name",
            "rx_type",
            "drug_strength",
            "drug_form",
            "quantity",
            "quantity_units",
            "refills",
            "days_supply",
            "date_written",
            "effective_date",
            "schedule_code",
            "lf_product_id",
            "rx_uuid",
            "clinical_difference_statement",
            "prescriber_npi",
            "prescriber_first_name",
            "prescriber_last_name",
            "prescriber_license_state",
            "prescriber_license_number",
            "prescriber_dea",
            "prescriber_address1",
            "prescriber_address2",
            "prescriber_city",
            "prescriber_state",
            "prescriber_zip",
            "prescriber_phone",
            "prescriber_email",
            "practice_id",
            "external_prescriber_id",
            "fulfillment_status",
            "is_active",
            "prescribed_at",
            "signed_at",
            "prescribed_by_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "provider_review_id",
            "prescribed_at",
            "signed_at",
            "prescribed_by_id",
            "created_at",
            "updated_at",
        ]

    def validate_medication_name(self, value):
        error = validate_medication_name(value)
        if error:
            raise serializers.ValidationError(error)
        return value.strip()

    def validate_dosage(self, value):
        error = validate_dosage(value)
        if error:
            raise serializers.ValidationError(error)
        return value.strip()

    def validate_frequency(self, value):
        error = validate_frequency(value)
        if error:
            raise serializers.ValidationError(error)
        return value.strip()

    def validate_instructions(self, value):
        error = validate_optional_prescription_text(value, "Instructions", 2000)
        if error:
            raise serializers.ValidationError(error)
        return value.strip() if value else ""

    def validate_pharmacy_name(self, value):
        error = validate_optional_prescription_text(value, "Pharmacy name", 128)
        if error:
            raise serializers.ValidationError(error)
        return value.strip() if value else ""

    def validate_route(self, value):
        if not value:
            return ""
        allowed = {choice[0] for choice in PatientPrescription.ROUTE_CHOICES}
        if value not in allowed:
            raise serializers.ValidationError("Select a valid route.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        data["provider_review_id"] = (
            str(instance.provider_review_id) if instance.provider_review_id else None
        )
        data["prescribed_by_id"] = (
            str(instance.prescribed_by_id) if instance.prescribed_by_id else None
        )
        if instance.rx_uuid:
            data["rx_uuid"] = str(instance.rx_uuid)
        if instance.date_written:
            data["date_written"] = instance.date_written.isoformat()
        if instance.effective_date:
            data["effective_date"] = instance.effective_date.isoformat()
        if instance.prescribed_at:
            data["prescribed_at"] = instance.prescribed_at.isoformat()
        if instance.signed_at:
            data["signed_at"] = instance.signed_at.isoformat()
        if instance.created_at:
            data["created_at"] = instance.created_at.isoformat()
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()
        return data

from __future__ import annotations

from apps.prescriptions.models import PatientPrescription
from apps.pharmacy.models import PharmacyOrder


class PreflightError(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def run_preflight(*, order: PharmacyOrder, prescription: PatientPrescription, snapshot: dict) -> None:
    errors: list[str] = []

    account = snapshot.get("account") or {}
    identity = snapshot.get("identity_contact") or {}

    if not prescription.medication_name:
        errors.append("Prescription medication_name is required.")
    if not prescription.prescriber_npi:
        errors.append("Prescriber NPI is required.")
    if not prescription.prescriber_last_name:
        errors.append("Prescriber last name is required.")
    if prescription.fulfillment_status not in ("signed", "sent_to_pharmacy"):
        errors.append("Prescription must be signed before pharmacy submit.")

    has_ship = bool(order.ship_to_address_line_1) or bool(identity.get("address"))
    if not has_ship:
        errors.append("Shipping address is required.")

    if not account.get("first_name") or not account.get("last_name"):
        errors.append("Patient name is required in submission snapshot.")
    if not account.get("dob"):
        errors.append("Patient date of birth is required.")
    if not account.get("state"):
        errors.append("Patient state is required.")

    if prescription.lf_product_id is None:
        errors.append("lf_product_id must be resolved from pharmacy product catalog.")

    if errors:
        raise PreflightError(errors)

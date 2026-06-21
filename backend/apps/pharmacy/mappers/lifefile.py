from __future__ import annotations

from datetime import date
from typing import Any

from django.utils import timezone

GENDER_MAP = {
    "female": "f",
    "male": "m",
    "intersex": "u",
    "unknown": "u",
    "": "u",
}


def map_gender(value: str | None) -> str:
    return GENDER_MAP.get((value or "").strip().lower(), "u")


def format_phone(value: str | None) -> str:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10:
        return (value or "").strip()
    return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"


class LifeFilePayloadMapper:
    def __init__(self, *, shipping_service: int, handling_service: int, practice_id: int):
        self.shipping_service = shipping_service
        self.handling_service = handling_service
        self.practice_id = practice_id

    def build(
        self,
        *,
        order,
        prescription,
        snapshot: dict,
        message_id: int,
    ) -> dict[str, Any]:
        account = snapshot.get("account") or {}
        identity = snapshot.get("identity_contact") or {}
        clinical = snapshot.get("clinical") or {}
        prefs = clinical.get("medication_preferences") or {}

        ship = self._shipping_block(order, account, identity, prefs)
        patient = self._patient_block(account, identity, snapshot)
        prescriber = self._prescriber_block(prescription)
        rxs = self._rx_block(prescription)
        clinical_rows = self._clinical_block(clinical)

        return {
            "message": {
                "id": message_id,
                "sentTime": timezone.now().isoformat(),
            },
            "order": {
                "general": {
                    "referenceId": str(order.external_reference_id or order.id),
                    "memo": "Aretide weight management",
                },
                "prescriber": prescriber,
                "practice": {"id": self.practice_id or prescription.practice_id or 0},
                "patient": patient,
                "shipping": ship,
                "billing": {"payorType": "pat"},
                "rxs": rxs,
                "clinical": clinical_rows,
            },
        }

    def _shipping_block(self, order, account, identity, prefs) -> dict[str, Any]:
        if order.ship_to_address_line_1:
            return {
                "recipientType": order.recipient_type,
                "recipientFirstName": order.ship_to_first_name,
                "recipientLastName": order.ship_to_last_name,
                "recipientPhone": format_phone(order.ship_to_phone),
                "recipientEmail": order.ship_to_email,
                "addressLine1": order.ship_to_address_line_1,
                "addressLine2": order.ship_to_address_line_2 or "",
                "city": order.ship_to_city,
                "state": order.ship_to_state,
                "zipCode": order.ship_to_zip_code,
                "country": order.ship_to_country or "US",
                "service": order.shipping_service_code or self.shipping_service,
                "handlingService": order.handling_service_code or self.handling_service,
            }

        use_alt = prefs.get("use_different_shipping_address") is True
        if use_alt:
            address1 = str(prefs.get("shipping_address") or "")
            city = str(prefs.get("shipping_city") or "")
            state = str(account.get("state") or "")
            zip_code = str(prefs.get("shipping_zip") or "")
        else:
            address1 = str(identity.get("address") or "")
            city = str(identity.get("city") or "")
            state = str(account.get("state") or "")
            zip_code = str(identity.get("zip") or "")

        return {
            "recipientType": "patient",
            "recipientFirstName": account.get("first_name") or "",
            "recipientLastName": account.get("last_name") or "",
            "recipientPhone": format_phone(account.get("phone")),
            "recipientEmail": account.get("email") or "",
            "addressLine1": address1,
            "addressLine2": "",
            "city": city,
            "state": state,
            "zipCode": zip_code,
            "country": "US",
            "service": self.shipping_service,
            "handlingService": self.handling_service,
        }

    def _patient_block(self, account, identity, snapshot) -> dict[str, Any]:
        screening = snapshot.get("eligibility_screening") or {}
        sex = screening.get("sex_assigned_at_birth") or screening.get("gender_identity") or ""
        dob = account.get("dob") or ""
        return {
            "lastName": account.get("last_name") or "",
            "firstName": account.get("first_name") or "",
            "gender": map_gender(str(sex)),
            "dateOfBirth": dob[:10] if dob else "",
            "address1": identity.get("address") or "",
            "address2": "",
            "city": identity.get("city") or "",
            "state": account.get("state") or "",
            "zip": identity.get("zip") or "",
            "country": "US",
            "phoneHome": format_phone(account.get("phone")),
            "phoneMobile": format_phone(account.get("phone")),
            "email": account.get("email") or "",
        }

    def _prescriber_block(self, prescription) -> dict[str, Any]:
        return {
            "npi": prescription.prescriber_npi or "",
            "lastName": prescription.prescriber_last_name or "",
            "firstName": prescription.prescriber_first_name or "",
            "licenseState": prescription.prescriber_license_state or "",
            "licenseNumber": prescription.prescriber_license_number or "",
            "dea": prescription.prescriber_dea or "",
            "address1": prescription.prescriber_address1 or "",
            "address2": prescription.prescriber_address2 or "",
            "city": prescription.prescriber_city or "",
            "state": prescription.prescriber_state or "",
            "zip": prescription.prescriber_zip or "",
            "phone": format_phone(prescription.prescriber_phone),
            "email": prescription.prescriber_email or "",
        }

    def _rx_block(self, prescription) -> list[dict[str, Any]]:
        rx = {
            "rxType": prescription.rx_type or "new",
            "drugName": prescription.medication_name,
            "drugStrength": prescription.drug_strength or prescription.dosage,
            "drugForm": prescription.drug_form or prescription.route,
            "quantity": prescription.quantity or "1",
            "quantityUnits": prescription.quantity_units or "",
            "directions": prescription.directions,
            "refills": prescription.refills or 0,
            "daysSupply": prescription.days_supply,
            "dateWritten": (
                prescription.date_written.isoformat()
                if isinstance(prescription.date_written, date)
                else (prescription.prescribed_at.date().isoformat() if prescription.prescribed_at else "")
            ),
            "scheduleCode": prescription.schedule_code or "0",
        }
        if prescription.lf_product_id:
            rx["lfProductID"] = prescription.lf_product_id
        if prescription.rx_uuid:
            rx["uuid"] = str(prescription.rx_uuid)
        return [rx]

    def _clinical_block(self, clinical: dict) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        allergies = clinical.get("allergies") or {}
        for entry in allergies.get("list") or []:
            if not isinstance(entry, dict):
                continue
            allergy = str(entry.get("allergy") or "").strip()
            if not allergy:
                continue
            rows.append(
                {
                    "type": "allergy",
                    "code": "PATIENT_REPORTED",
                    "description": allergy,
                    "reaction": str(entry.get("reaction") or ""),
                    "source": "Patient",
                }
            )
        meds = clinical.get("medications") or {}
        for entry in meds.get("list") or []:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("name") or "").strip()
            if not name:
                continue
            rows.append(
                {
                    "type": "medication",
                    "code": "PATIENT_REPORTED",
                    "description": name,
                    "source": "Patient",
                }
            )
        return rows

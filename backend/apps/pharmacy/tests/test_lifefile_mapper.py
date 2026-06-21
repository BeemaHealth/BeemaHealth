from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.submissions import create_intake_submission
from apps.pharmacy.mappers.lifefile import LifeFilePayloadMapper, map_gender
from apps.pharmacy.models import PharmacyOrder
from apps.prescriptions.models import PatientPrescription


class LifeFileMapperTests(TestCase):
    def test_map_gender(self):
        self.assertEqual(map_gender("female"), "f")
        self.assertEqual(map_gender("male"), "m")
        self.assertEqual(map_gender("unknown"), "u")

    def test_build_payload_includes_patient_prescriber_and_rx(self):
        user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
            dob="1990-01-01",
            state="Colorado",
        )
        intake = MedicalIntake.objects.create(
            user=user,
            status="approved",
            submitted_at=timezone.now(),
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
            medication_preferences={"treatment": "compounded_sema"},
        )
        submission = create_intake_submission(user, intake, submitted_at=intake.submitted_at)
        prescription = PatientPrescription.objects.create(
            user=user,
            medication_name="Semaglutide",
            dosage="2.5 mg/mL",
            frequency="Once weekly",
            drug_strength="2.5 mg/mL",
            drug_form="injection",
            prescriber_npi="1234567890",
            prescriber_last_name="Smith",
            lf_product_id=1001,
            fulfillment_status="signed",
            is_active=True,
        )
        order = PharmacyOrder.objects.create(
            prescription=prescription,
            user=user,
            external_reference_id=str(prescription.id),
        )
        mapper = LifeFilePayloadMapper(shipping_service=10, handling_service=20, practice_id=999)
        payload = mapper.build(
            order=order,
            prescription=prescription,
            snapshot=submission.snapshot,
            message_id=1,
        )
        self.assertEqual(payload["order"]["patient"]["lastName"], "Doe")
        self.assertEqual(payload["order"]["prescriber"]["npi"], "1234567890")
        self.assertEqual(payload["order"]["rxs"][0]["drugName"], "Semaglutide")
        self.assertEqual(payload["order"]["shipping"]["service"], 10)

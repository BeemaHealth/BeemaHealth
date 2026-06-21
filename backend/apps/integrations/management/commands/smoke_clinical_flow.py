from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.test.utils import setup_test_environment
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.submissions import create_intake_submission
from apps.pharmacy.models import PharmacyOrder, PharmacyProductCatalog
from apps.prescriptions.models import PatientPrescription
from apps.reviews.models import ProviderReview


class Command(BaseCommand):
    help = "Run an end-to-end clinical integration smoke flow using mock adapters."

    @staticmethod
    def _response_detail(response):
        return getattr(response, "data", None) or response.content.decode()

    def handle(self, *args, **options):
        call_command("migrate", verbosity=0, interactive=False)
        setup_test_environment()
        self.stdout.write("Starting clinical integration smoke flow...")

        patient = User.objects.create_user(
            email=f"smoke-patient-{timezone.now().timestamp()}@example.com",
            password="secure-pass-1",
            first_name="Smoke",
            last_name="Patient",
            phone="3035550100",
            dob="1990-01-01",
            state="Colorado",
        )
        provider = User.objects.create_user(
            email=f"smoke-provider-{timezone.now().timestamp()}@example.com",
            password="secure-pass-1",
            is_provider=True,
        )
        intake = MedicalIntake.objects.create(
            user=patient,
            status="submitted",
            submitted_at=timezone.now(),
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
            medication_preferences={"treatment": "compounded_sema"},
        )
        create_intake_submission(patient, intake, submitted_at=intake.submitted_at)

        provider_client = APIClient()
        provider_client.force_authenticate(user=provider)
        patient_client = APIClient()
        patient_client.force_authenticate(user=patient)

        provider_client.patch(
            f"/api/admin/patients/{patient.id}/",
            {
                "status": "more_info_needed",
                "decision": "needs_more_info",
                "patient_note": "Update your address",
            },
            format="json",
        )
        patient_client.patch(
            "/api/medical-intakes/me/",
            {"identity": {"address": "456 Oak Ave", "city": "Denver", "zip": "80203"}},
            format="json",
        )
        patient_client.post("/api/medical-intakes/me/resubmit/", format="json")

        webhook_payload = {
            "patient_id": str(patient.id),
            "external_review_id": "smoke-consult",
            "status": "approved",
            "decision": "approved",
            "patient_note": "Approved",
            "prescription": {
                "drug_name": "Semaglutide",
                "drug_strength": "2.5 mg/mL",
                "drug_form": "injection",
                "quantity": "1",
                "quantity_units": "vial",
                "frequency": "Once weekly",
                "instructions": "Inject weekly",
                "lf_product_id": 1001,
            },
            "prescriber": {
                "npi": "1234567890",
                "last_name": "Smith",
                "first_name": "Jane",
                "license_state": "CO",
            },
        }
        doctor_response = APIClient().post(
            "/api/webhooks/doctor/",
            webhook_payload,
            format="json",
            HTTP_AUTHORIZATION="Bearer dev-doctor-webhook-secret",
        )
        if doctor_response.status_code != 200:
            raise CommandError(
                f"Doctor webhook failed: {self._response_detail(doctor_response)}"
            )

        catalog = PharmacyProductCatalog.objects.filter(offering_slug="compounded_sema").first()
        if catalog and not catalog.lf_product_id:
            catalog.lf_product_id = 1001
            catalog.save()

        prescription = PatientPrescription.objects.filter(user=patient, is_active=True).first()
        pharmacy_response = provider_client.post(
            "/api/pharmacy/orders/",
            {"prescription_id": str(prescription.id), "pharmacy_partner": "mock"},
            format="json",
        )
        if pharmacy_response.status_code != 201:
            raise CommandError(
                f"Pharmacy submit failed: {self._response_detail(pharmacy_response)}"
            )

        order = PharmacyOrder.objects.filter(user=patient).first()
        lifefile_response = APIClient().post(
            "/api/webhooks/lifefile/",
            {
                "orderId": order.external_order_id,
                "referenceId": str(prescription.id),
                "status": "shipped",
                "trackingNumber": "1ZSMOKE123",
                "carrier": "UPS",
                "eventId": "smoke-shipped",
            },
            format="json",
            HTTP_AUTHORIZATION="Basic bGlmZWZpbGVfd2ViaG9vazpkZXYtbGlmZWZpbGUtd2ViaG9vay1wYXNz",
        )
        if lifefile_response.status_code != 200:
            raise CommandError(
                f"LifeFile webhook failed: {self._response_detail(lifefile_response)}"
            )

        review = ProviderReview.objects.get(user=patient)
        order.refresh_from_db()
        self.stdout.write(self.style.SUCCESS("Smoke flow completed successfully."))
        self.stdout.write(f"Review status: {review.status}")
        self.stdout.write(f"Prescription: {prescription.medication_name}")
        self.stdout.write(f"Pharmacy order status: {order.status}")
        self.stdout.write(f"Tracking: {order.tracking_number}")

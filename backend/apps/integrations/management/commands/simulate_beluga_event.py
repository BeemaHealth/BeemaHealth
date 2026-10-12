"""DEV ONLY: deliver a realistic Beluga webhook through the real ingest and process path.

    python manage.py simulate_beluga_event RX_WRITTEN --treatment <uuid> --strength 0.5mg
    python manage.py simulate_beluga_event CONSULT_CONCLUDED --master-id <id> --outcome prescribed

Payloads follow docs/vendor/BELUGA_API.md. The shared secret header is sent exactly as Beluga
would, so the real authentication check runs. Refuses to run unless DEBUG is true.
"""
import json
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.integrations import webhooks
from apps.integrations.adapters.beluga import KNOWN_EVENTS
from apps.integrations.exceptions import WebhookAuthError

TEXT_EVENTS = {"DOCTOR_CHAT", "CS_MESSAGE"}


class Command(BaseCommand):
    help = "DEV ONLY. Simulate a Beluga webhook for a visit (requires DEBUG=true)."

    def add_arguments(self, parser):
        parser.add_argument("event", choices=sorted(KNOWN_EVENTS))
        parser.add_argument("--master-id", help="Beluga masterId (Visit.external_id)")
        parser.add_argument("--treatment", help="Treatment uuid; uses its latest visit's masterId")
        parser.add_argument("--outcome", choices=["prescribed", "referred"], default="prescribed", help="CONSULT_CONCLUDED outcome")
        parser.add_argument("--text", default="", help="Message text for DOCTOR_CHAT and CS_MESSAGE")
        parser.add_argument("--strength", default="", help="RX_WRITTEN strength, e.g. 0.5mg (default: requested strength)")
        parser.add_argument("--doctor-name", default="Dr. Dev Tester")
        parser.add_argument("--rx-id", default="")
        parser.add_argument("--order-id", default="", help="Pharmacy order id (default: stable per treatment)")
        parser.add_argument("--tracking", default="", help="Tracking number (default: stable per treatment)")
        parser.add_argument("--carrier", default="UPS")
        parser.add_argument("--scheduled-date", default="", help="ISO 8601 for BOOKING_CREATED/RESCHEDULED (default: +2 days)")
        parser.add_argument("--location", default="https://video.example.test/dev-visit")
        parser.add_argument("--no-process", action="store_true", help="Only ingest; leave processing to process_pending_events")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("simulate_beluga_event is dev only and refuses to run when DEBUG is false.")
        if not settings.BELUGA_WEBHOOK_SECRET:
            raise CommandError("Set BELUGA_WEBHOOK_SECRET in your environment so the real secret check can run.")
        visit = self._resolve_visit(options)
        event = options["event"]
        payload = self.build_payload(event, visit, options)
        raw = json.dumps(payload).encode()
        try:
            stored = webhooks.ingest("beluga", {"X-Webhook-Secret": settings.BELUGA_WEBHOOK_SECRET}, raw)
        except WebhookAuthError as exc:
            raise CommandError(str(exc)) from exc
        if not options["no_process"]:
            stored = webhooks.process(stored)
        self.stdout.write(
            f"event={event} masterId={visit.external_id} inbound_event={stored.pk} status={stored.status}"
            + (f" error={stored.last_error}" if stored.last_error else "")
        )

    def _resolve_visit(self, options):
        from apps.clinical.models import Visit

        if options["treatment"]:
            visit = Visit.objects.filter(treatment_id=options["treatment"]).exclude(external_id="").order_by("-created_at").first()
        elif options["master_id"]:
            visit = Visit.objects.filter(external_id=options["master_id"]).order_by("-created_at").first()
        else:
            raise CommandError("Pass --treatment <uuid> or --master-id <id>.")
        if visit is None:
            raise CommandError("No visit with a masterId found. Submit the visit to the network first.")
        return visit

    def build_payload(self, event: str, visit, options) -> dict:
        treatment = visit.treatment
        base = {"masterId": visit.external_id, "event": event}
        short = str(treatment.pk).split("-")[0]
        tracking = options["tracking"] or f"DEV{short.upper()}"
        if event == "RX_WRITTEN":
            variant = treatment.variant
            mapping = variant.mappings.filter(organization=treatment.network).first() if variant else None
            strength = options["strength"] or (f"{treatment.requested_strength_mg.normalize():f}mg" if treatment.requested_strength_mg else "0.25mg")
            return {**base, "docName": options["doctor_name"], "medsPrescribed": [{
                "name": (variant.drug.title() if variant else "Dev Medication"), "strength": strength, "refills": "2", "quantity": "1",
                "medId": mapping.vendor_sku if mapping else "DEV-MED", "rxId": options["rx_id"] or f"dev-rx-{uuid.uuid4().hex[:8]}",
                "pharmacyNotes": "Dev simulated prescription",
            }]}
        if event == "CONSULT_CONCLUDED":
            return {**base, "visitOutcome": options["outcome"]}
        if event in TEXT_EVENTS:
            if not options["text"].strip():
                raise CommandError(f"{event} requires --text.")
            return {**base, "content": options["text"]}
        if event in ("BOOKING_CREATED", "BOOKING_RESCHEDULED"):
            when = options["scheduled_date"] or (timezone.now() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            return {**base, "docName": options["doctor_name"], "scheduledDate": when, "location": options["location"]}
        if event.startswith("PHARMACY_ORDER_"):
            payload = {**base, "orderId": options["order_id"] or f"dev-order-{short}"}
            if event == "PHARMACY_ORDER_SHIPPED":
                payload["info"] = {"carrier": options["carrier"], "tracking": tracking}
            return payload
        if event.startswith("PACKAGE_"):
            info = {"trackerStatus": event.removeprefix("PACKAGE_").lower(), "trackerId": f"trk-{short}", "trackingUrl": f"https://track.example.test/{tracking}",
                    "tracking": tracking, "carrier": options["carrier"]}
            if event == "PACKAGE_DELIVERED":
                info["deliveredDate"] = timezone.now().strftime("%Y-%m-%d")
            return {**base, "info": info}
        if event.startswith("LAB_ORDER_"):
            return {**base, "orderId": options["order_id"] or f"dev-lab-{short}"}
        return base

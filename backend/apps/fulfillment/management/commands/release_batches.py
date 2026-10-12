"""Daily: release due shipment batches that pass the release rules."""
from django.core.management.base import BaseCommand

from apps.fulfillment.services import release_due_batches


class Command(BaseCommand):
    help = "Release due ShipmentBatches (treatment active or prescribed, check-ins complete)."

    def handle(self, *args, **options):
        stats = release_due_batches()
        self.stdout.write(", ".join(f"{k}={v}" for k, v in sorted(stats.items())))

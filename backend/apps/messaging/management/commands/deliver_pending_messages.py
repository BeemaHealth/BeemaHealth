"""Management command to deliver pending (queued) messages with exponential backoff."""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.messaging.services import deliver_pending_messages


class Command(BaseCommand):
    help = "Deliver pending (queued) messages to the network adapter with exponential backoff"

    def handle(self, *args, **options):
        now = timezone.now()
        stats = deliver_pending_messages(now=now)

        self.stdout.write(
            self.style.SUCCESS(
                f"Delivered {stats['delivered']} messages, "
                f"{stats['failed']} failed"
            )
        )

        if stats["errors"]:
            self.stdout.write(self.style.ERROR(f"Errors: {stats['errors']}"))

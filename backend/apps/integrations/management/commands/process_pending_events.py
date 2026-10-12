"""Process received and retryable inbound webhook events (run every minute)."""
from django.core.management.base import BaseCommand

from apps.integrations.webhooks import process_pending


class Command(BaseCommand):
    help = "Process received and retryable InboundEvents. Dead letters after INTEGRATIONS_MAX_ATTEMPTS."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)
        parser.add_argument("--vendor", choices=["beluga", "lifefile", "stripe"])

    def handle(self, *args, **options):
        stats = process_pending(limit=options["limit"], vendor=options["vendor"])
        self.stdout.write(
            "processed={processed} ignored={ignored} failed={failed} dead={dead}".format(**stats)
        )

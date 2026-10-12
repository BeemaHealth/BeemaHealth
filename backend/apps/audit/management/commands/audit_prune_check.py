from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import AuditEvent

RETENTION_YEARS = 6


class Command(BaseCommand):
    help = "Report how many audit events are older than the retention window. Never deletes."

    def add_arguments(self, parser):
        parser.add_argument("--years", type=int, default=RETENTION_YEARS)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=365 * options["years"])
        total = AuditEvent.objects.count()
        old = AuditEvent.objects.filter(created_at__lt=cutoff).count()
        self.stdout.write(f"total={total} older_than_{options['years']}y={old} (report only, nothing deleted)")

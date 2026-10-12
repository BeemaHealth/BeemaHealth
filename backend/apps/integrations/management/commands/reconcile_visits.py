"""Nightly: fetch open visits from the network and repair missed webhook events."""
from django.core.management.base import BaseCommand

from apps.integrations.services import reconcile_visits


class Command(BaseCommand):
    help = "Reconcile open visits against the doctor network."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        report = reconcile_visits(limit=options["limit"])
        self.stdout.write(
            f"checked={report.checked} repaired={report.repaired} unchanged={report.unchanged} errors={len(report.errors)}"
        )
        for line in report.errors:
            self.stderr.write(line)

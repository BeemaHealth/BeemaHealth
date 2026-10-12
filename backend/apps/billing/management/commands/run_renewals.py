"""Charge due renewals and close finished terms. Safe to run repeatedly; each period charges once."""
from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand, CommandError

from apps.billing.services import run_renewals


class Command(BaseCommand):
    help = "Charge subscription renewals due on or before a date (default: today)."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--date", help="Run as of this date, YYYY-MM-DD.")

    def handle(self, *args, **options) -> None:
        try:
            today = date.fromisoformat(options["date"]) if options.get("date") else None
        except ValueError as exc:
            raise CommandError("--date must be YYYY-MM-DD.") from exc
        report = run_renewals(today)
        self.stdout.write(
            f"charged={len(report.charged)} failed={len(report.failed)} skipped={len(report.skipped)} "
            f"canceled={len(report.canceled)} completed={len(report.completed)} errors={len(report.errors)}"
        )

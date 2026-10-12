from django.core.management.base import BaseCommand

from apps.questionnaires.loader import load_questionnaire_definitions


class Command(BaseCommand):
    help = "Load layouts and publish questionnaire definitions from backend/definitions (idempotent)."

    def handle(self, *args, **options) -> None:
        versions = load_questionnaire_definitions()
        for version in versions:
            self.stdout.write(f"{version.questionnaire.slug} {version.version_label}: {version.status}")
        self.stdout.write(self.style.SUCCESS(f"{len(versions)} questionnaire version(s) loaded."))

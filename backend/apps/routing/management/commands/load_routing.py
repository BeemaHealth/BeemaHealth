"""Load routing rules from definitions/catalog/routing.yaml (run after load_definitions)."""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.routing.loader import RoutingDefinitionError, load_routing_definitions


class Command(BaseCommand):
    help = "Load routing organizations and rules (idempotent)"

    def handle(self, *args, **options):
        try:
            counts = load_routing_definitions(settings.DEFINITIONS_DIR)
        except RoutingDefinitionError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS(f"Routing loaded: {counts['organizations']} orgs, {counts['rules']} rules"))

"""Management command to load catalog and app-specific definitions."""
import logging
import shutil
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.catalog.loader import get_loaders, load_catalog_definitions

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Load definitions from YAML files."""

    help = "Load catalog and app-specific definitions (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument("--dev", action="store_true", help="Also load definitions/dev (DEBUG only).")

    def handle(self, *args, **options):
        """Load all definitions."""
        if options["dev"] and not settings.DEBUG:
            raise CommandError("--dev loads test data and is refused when DEBUG is false.")
        self.stdout.write("Loading definitions...")

        definitions_dir = settings.DEFINITIONS_DIR
        dev_mode = options.get("dev", False)

        # Load catalog definitions
        try:
            load_catalog_definitions(definitions_dir, dev_mode=dev_mode)
            self.stdout.write(self.style.SUCCESS("Catalog definitions loaded"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error loading catalog definitions: {e}"))
            raise

        # Load app-specific definitions via registry
        loaders = get_loaders()
        for app_name, loader_func in loaders.items():
            try:
                loader_func(definitions_dir)
                self.stdout.write(self.style.SUCCESS(f"{app_name} definitions loaded"))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error loading {app_name} definitions: {e}"))
                raise

        if options["dev"]:
            self._load_dev(definitions_dir)

        self.stdout.write(self.style.SUCCESS("All definitions loaded successfully"))

    def _load_dev(self, definitions_dir):
        """Stage definitions/dev into the layout the loaders expect, then load it."""
        dev = Path(definitions_dir) / "dev"
        with tempfile.TemporaryDirectory() as tmp:
            stage = Path(tmp)
            for sub in ("catalog", "questionnaires", "layouts"):
                (stage / sub).mkdir()
            shutil.copy(dev / "catalog.yaml", stage / "catalog" / "catalog.yaml")
            shutil.copy(dev / "routing.yaml", stage / "catalog" / "routing.yaml")
            shutil.copy(
                dev / "variant_mappings.yaml",
                stage / "catalog" / "variant_mappings_dev.yaml",
            )
            for path in dev.glob("*.json"):
                shutil.copy(path, stage / "questionnaires" / path.name)
            for path in (Path(definitions_dir) / "layouts").glob("*.json"):
                shutil.copy(path, stage / "layouts" / path.name)
            load_catalog_definitions(stage, dev_mode=True)
            loaders = get_loaders()
            for name in ("routing", "questionnaires"):
                if name in loaders:
                    loaders[name](stage)
        self.stdout.write(self.style.SUCCESS("DEV test definitions loaded (dev-test-visit, quick_test)"))

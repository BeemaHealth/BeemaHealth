from django.apps import AppConfig


class ClinicalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clinical"

    def ready(self) -> None:
        """Contribute clinical records to the patient data export when that registry exists."""
        try:
            from apps.patients.export import register
        except ImportError:
            return
        from .export import export_clinical

        register(export_clinical)

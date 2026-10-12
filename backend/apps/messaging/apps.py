from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.messaging"

    def ready(self):
        """Register messaging data in patient export."""
        try:
            from apps.patients.export import register
            from .services import _build_patient_messages_export

            register(_build_patient_messages_export)
        except (ImportError, AttributeError):
            # patients app not ready yet or export not set up
            pass

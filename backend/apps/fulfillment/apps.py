import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class FulfillmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.fulfillment"

    def ready(self) -> None:
        """Contribute fulfillment data to the patient export when the patients app is present."""
        try:
            from apps.patients.export import register
        except ImportError:
            logger.warning("patients.export unavailable; fulfillment export not registered")
            return
        from .services import export_for_patient

        register(export_for_patient)

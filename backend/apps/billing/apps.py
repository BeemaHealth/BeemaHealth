import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class BillingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.billing"

    def ready(self) -> None:
        try:
            from apps.patients.export import register
        except ImportError:
            logger.warning("patients export registry not available; billing export not registered")
            return
        from .export import export_billing

        register(export_billing)

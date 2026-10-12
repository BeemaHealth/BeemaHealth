from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.integrations"

    def ready(self) -> None:
        """Fail at startup if the dev fake network is requested outside DEBUG."""
        from apps.integrations.adapters.beluga import fake_mode_enabled

        fake_mode_enabled()
